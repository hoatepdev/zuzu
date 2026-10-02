import { ConflictException, Injectable, Logger } from '@nestjs/common';
import { PrintJobStatus, PrintJobType, Prisma } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../prisma.service';

export type ReceiptPayload = { code: string; createdAt: string; customerName?: string; phone?: string; note?: string };

const MAX_ATTEMPTS = 3;

@Injectable()
export class PrintingService {
  private readonly logger = new Logger(PrintingService.name);
  private readonly claimTimeoutMs = Number(process.env.PRINT_JOB_CLAIM_TIMEOUT_MS ?? 60_000);
  private readonly retryDelayMs = Number(process.env.PRINT_JOB_RETRY_DELAY_MS ?? 10_000);

  constructor(private readonly prisma: PrismaService) {}

  enqueue(tx: Prisma.TransactionClient, orderId: string, payload: ReceiptPayload) {
    return tx.printJob.create({ data: { orderId, type: PrintJobType.ORDER_RECEIPT, payload } });
  }

  async claimNext() {
    const now = new Date();
    const staleBefore = new Date(now.getTime() - this.claimTimeoutMs);
    return this.prisma.$transaction(async (tx) => {
      const expired = await tx.printJob.findMany({
        where: { status: PrintJobStatus.PRINTING, claimedAt: { lt: staleBefore } },
        select: { id: true, orderId: true, attempts: true }
      });
      for (const job of expired) {
        const terminal = job.attempts >= MAX_ATTEMPTS;
        const recovered = await tx.printJob.updateMany({
          where: { id: job.id, status: PrintJobStatus.PRINTING, claimedAt: { lt: staleBefore } },
          data: terminal
            ? { status: PrintJobStatus.FAILED, failedAt: now, claimToken: null, lastError: 'Print Agent không xác nhận kịp thời' }
            : { status: PrintJobStatus.PENDING, availableAt: now, claimedAt: null, claimToken: null, lastError: 'Print Agent không xác nhận kịp thời' }
        });
        if (recovered.count) this.logger.warn(`print_job=${job.id} order=${job.orderId} event=${terminal ? 'failed' : 'lease_expired'} attempts=${job.attempts}`);
      }

      const rows = await tx.$queryRaw<Array<{ id: string }>>`
        SELECT "id"
        FROM "PrintJob"
        WHERE "status" = 'PENDING'::"PrintJobStatus" AND "availableAt" <= NOW()
        ORDER BY "createdAt" ASC
        FOR UPDATE SKIP LOCKED
        LIMIT 1
      `;
      if (!rows[0]) return null;

      const claimToken = randomUUID();
      const job = await tx.printJob.update({
        where: { id: rows[0].id },
        data: { status: PrintJobStatus.PRINTING, attempts: { increment: 1 }, claimedAt: now, claimToken },
        select: { id: true, orderId: true, type: true, payload: true, attempts: true, claimToken: true }
      });
      this.logger.log(`print_job=${job.id} order=${job.orderId} event=claimed attempts=${job.attempts}`);
      return job;
    });
  }

  async succeed(id: string, claimToken: string) {
    const result = await this.prisma.printJob.updateMany({
      where: { id, status: PrintJobStatus.PRINTING, claimToken },
      data: { status: PrintJobStatus.PRINTED, printedAt: new Date(), claimToken: null, lastError: null }
    });
    if (!result.count) throw new ConflictException('Print job không còn được agent này giữ');
    this.logger.log(`print_job=${id} event=printed`);
    return { ok: true };
  }

  async fail(id: string, claimToken: string, error: string) {
    return this.prisma.$transaction(async (tx) => {
      const job = await tx.printJob.findFirst({ where: { id, status: PrintJobStatus.PRINTING, claimToken }, select: { orderId: true, attempts: true } });
      if (!job) throw new ConflictException('Print job không còn được agent này giữ');
      const terminal = job.attempts >= MAX_ATTEMPTS;
      const result = await tx.printJob.updateMany({
        where: { id, status: PrintJobStatus.PRINTING, claimToken },
        data: terminal
          ? { status: PrintJobStatus.FAILED, failedAt: new Date(), claimToken: null, lastError: error }
          : { status: PrintJobStatus.PENDING, availableAt: new Date(Date.now() + this.retryDelayMs), claimedAt: null, claimToken: null, lastError: error }
      });
      if (!result.count) throw new ConflictException('Print job không còn được agent này giữ');
      this.logger.warn(`print_job=${id} order=${job.orderId} event=${terminal ? 'failed' : 'retry_scheduled'} attempts=${job.attempts}`);
      return { ok: true, status: terminal ? PrintJobStatus.FAILED : PrintJobStatus.PENDING };
    });
  }
}
