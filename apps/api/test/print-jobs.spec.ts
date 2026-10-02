import { ConflictException, UnauthorizedException, type ExecutionContext } from '@nestjs/common';
import { PrintJobStatus, PrismaClient, Role } from '@prisma/client';
import { AppController } from '../src/app.controller';
import { PrintAgentGuard } from '../src/printing/print-agent.guard';
import { PrintingService } from '../src/printing/printing.service';
import { PrismaService } from '../src/prisma.service';

process.env.PRINT_JOB_RETRY_DELAY_MS = '0';
process.env.PRINT_JOB_CLAIM_TIMEOUT_MS = '60000';

const prisma = new PrismaClient();
const db = prisma as unknown as PrismaService;
const printing = new PrintingService(db);
const suffix = Date.now().toString();
let userId: string;
const orderIds: string[] = [];

async function makeOrder(code: string) {
  const order = await prisma.order.create({ data: { code, createdById: userId } });
  orderIds.push(order.id);
  return order;
}

async function makeJob(code: string) {
  const order = await makeOrder(code);
  return prisma.printJob.create({ data: { orderId: order.id, payload: { code, createdAt: new Date().toISOString() } } });
}

const claimAndFail = async (jobId: string) => {
  const claimed = await printing.claimNext();
  if (!claimed || claimed.id !== jobId) throw new Error(`expected job ${jobId}, got ${claimed?.id}`);
  return printing.fail(claimed.id, claimed.claimToken!, 'Máy in đang ngoại tuyến');
};

beforeAll(async () => {
  userId = (await prisma.user.create({ data: { username: `prn-${suffix}`, name: 'Print Test', role: Role.STAFF, passwordHash: 'unused' } })).id;
});

afterAll(async () => {
  await prisma.printJob.deleteMany({ where: { orderId: { in: orderIds } } });
  await prisma.order.deleteMany({ where: { id: { in: orderIds } } });
  await prisma.user.delete({ where: { id: userId } });
  await prisma.$disconnect();
});

it('claims each job exactly once under concurrent claims', async () => {
  const [jobA, jobB] = await Promise.all([makeJob(`ZU-PJ1${suffix.slice(-3)}`), makeJob(`ZU-PJ2${suffix.slice(-3)}`)]);
  const claims = await Promise.all([printing.claimNext(), printing.claimNext()]);
  const ids = claims.map((claim) => claim?.id).sort();
  expect(ids).toEqual([jobA.id, jobB.id].sort());
  for (const claim of claims) {
    expect(claim?.attempts).toBe(1);
    expect(claim!.claimToken).toBeTruthy();
  }
  const rows = await prisma.printJob.findMany({ where: { id: { in: ids as string[] } } });
  expect(rows.every((row) => row.status === PrintJobStatus.PRINTING)).toBe(true);
  await Promise.all(claims.map((claim) => printing.succeed(claim!.id, claim!.claimToken!)));
});

it('acknowledges success only with the live claim token', async () => {
  const job = await makeJob(`ZU-OK${suffix.slice(-4)}`);
  const claimed = await printing.claimNext();
  expect(claimed?.id).toBe(job.id);

  await expect(printing.succeed(job.id, 'wrong-token')).rejects.toThrow(ConflictException);
  expect((await prisma.printJob.findUniqueOrThrow({ where: { id: job.id } })).status).toBe(PrintJobStatus.PRINTING);

  await printing.succeed(job.id, claimed!.claimToken!);
  const done = await prisma.printJob.findUniqueOrThrow({ where: { id: job.id } });
  expect(done.status).toBe(PrintJobStatus.PRINTED);
  expect(done.printedAt).not.toBeNull();
  expect(done.claimToken).toBeNull();

  await expect(printing.succeed(job.id, claimed!.claimToken!)).rejects.toThrow(ConflictException);
});

it('retries failures then stops at three attempts as FAILED', async () => {
  const job = await makeJob(`ZU-F${suffix.slice(-4)}`);
  await claimAndFail(job.id);
  await claimAndFail(job.id);
  const last = await claimAndFail(job.id);
  expect(last).toMatchObject({ ok: true, status: PrintJobStatus.FAILED });

  const row = await prisma.printJob.findUniqueOrThrow({ where: { id: job.id } });
  expect(row.attempts).toBe(3);
  expect(row.status).toBe(PrintJobStatus.FAILED);
  expect(row.failedAt).not.toBeNull();
  expect(row.lastError).toBe('Máy in đang ngoại tuyến');

  const claimed = await printing.claimNext();
  if (claimed?.id === job.id) throw new Error('FAILED job must not be claimed again');
});

it('reclaims a stale PRINTING lease', async () => {
  const job = await makeJob(`ZU-S${suffix.slice(-4)}`);
  await prisma.printJob.update({
    where: { id: job.id },
    data: { status: PrintJobStatus.PRINTING, attempts: 1, claimedAt: new Date(Date.now() - 61_000), claimToken: 'expired-claim' }
  });
  const claimed = await printing.claimNext();
  expect(claimed?.id).toBe(job.id);
  expect(claimed?.attempts).toBe(2);
  expect(claimed?.claimToken).not.toBe('expired-claim');
});

it('reports database health without infrastructure details', async () => {
  await expect(new AppController(db).health()).resolves.toEqual({ ok: true, database: 'connected' });
});

it('authenticates the print agent with a timing-safe bearer token', async () => {
  const guard = new PrintAgentGuard();
  const run = (authorization?: string) =>
    guard.canActivate({ switchToHttp: () => ({ getRequest: () => ({ headers: authorization ? { authorization } : {} }) }) } as unknown as ExecutionContext);

  delete process.env.PRINT_AGENT_TOKEN;
  expect(() => run('Bearer anything')).toThrow(UnauthorizedException);

  process.env.PRINT_AGENT_TOKEN = 'shop-secret';
  try {
    expect(() => run()).toThrow(UnauthorizedException);
    expect(() => run('Bearer wrong')).toThrow(UnauthorizedException);
    expect(run('Bearer shop-secret')).toBe(true);
  } finally {
    delete process.env.PRINT_AGENT_TOKEN;
  }
});
