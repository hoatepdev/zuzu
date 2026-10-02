import { BadRequestException, Injectable } from '@nestjs/common';
import { PaymentMethod, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma.service';

const include = { openedBy: { select: { id: true, name: true } }, closedBy: { select: { id: true, name: true } } };
@Injectable()
export class ShiftsService {
  constructor(private readonly prisma: PrismaService) {}
  async current() {
    const shift = await this.prisma.shift.findFirst({ where: { closedAt: null }, include });
    if (!shift) return null;
    const [cashRevenue, bankRevenue, cashExpenses, bankExpenses] = await Promise.all([
      this.prisma.payment.aggregate({ where: { shiftId: shift.id, method: PaymentMethod.CASH }, _sum: { amount: true } }),
      this.prisma.payment.aggregate({ where: { shiftId: shift.id, method: PaymentMethod.BANK_TRANSFER }, _sum: { amount: true } }),
      this.prisma.expense.aggregate({ where: { shiftId: shift.id, paymentMethod: PaymentMethod.CASH, voidedAt: null }, _sum: { amount: true } }),
      this.prisma.expense.aggregate({ where: { shiftId: shift.id, paymentMethod: PaymentMethod.BANK_TRANSFER, voidedAt: null }, _sum: { amount: true } })
    ]);
    const cash = cashRevenue._sum.amount ?? new Prisma.Decimal(0);
    const cashSpent = cashExpenses._sum.amount ?? new Prisma.Decimal(0);
    return { ...shift, cashRevenue: cash, bankTransferRevenue: bankRevenue._sum.amount ?? new Prisma.Decimal(0), cashExpenses: cashSpent, bankTransferExpenses: bankExpenses._sum.amount ?? new Prisma.Decimal(0), systemCash: cash.minus(cashSpent) };
  }
  async list(page: number, limit: number) { const [items, total] = await Promise.all([this.prisma.shift.findMany({ where: { closedAt: { not: null } }, include, orderBy: { openedAt: 'desc' }, skip: (page - 1) * limit, take: limit }), this.prisma.shift.count({ where: { closedAt: { not: null } } })]); return { items, total, page, limit }; }
  async open(userId: string) {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const shift = await tx.shift.create({ data: { openedById: userId }, include });
        await tx.auditLog.create({ data: { userId, action: 'SHIFT_OPENED', entityType: 'SHIFT', entityId: shift.id, after: { openedAt: shift.openedAt.toISOString() } } });
        return shift;
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') throw new BadRequestException('Đã có ca đang mở');
      throw error;
    }
  }
  async close(id: string, actualCashValue: number, userId: string) {
    return this.prisma.$transaction(async (tx) => {
      const claimed = await tx.shift.updateMany({ where: { id, closedAt: null }, data: { closedAt: new Date(), closedById: userId } });
      if (!claimed.count) throw new BadRequestException('Ca không tồn tại hoặc đã chốt');
      const [cashRevenue, bankRevenue, cashExpenses, bankExpenses] = await Promise.all([
        tx.payment.aggregate({ where: { shiftId: id, method: PaymentMethod.CASH }, _sum: { amount: true } }),
        tx.payment.aggregate({ where: { shiftId: id, method: PaymentMethod.BANK_TRANSFER }, _sum: { amount: true } }),
        tx.expense.aggregate({ where: { shiftId: id, paymentMethod: PaymentMethod.CASH, voidedAt: null }, _sum: { amount: true } }),
        tx.expense.aggregate({ where: { shiftId: id, paymentMethod: PaymentMethod.BANK_TRANSFER, voidedAt: null }, _sum: { amount: true } })
      ]);
      const cash = cashRevenue._sum.amount ?? new Prisma.Decimal(0);
      const bank = bankRevenue._sum.amount ?? new Prisma.Decimal(0);
      const cashSpent = cashExpenses._sum.amount ?? new Prisma.Decimal(0);
      const bankSpent = bankExpenses._sum.amount ?? new Prisma.Decimal(0);
      const systemCash = cash.minus(cashSpent);
      const actualCash = new Prisma.Decimal(actualCashValue);
      const shift = await tx.shift.update({ where: { id }, data: { cashRevenue: cash, bankTransferRevenue: bank, cashExpenses: cashSpent, bankTransferExpenses: bankSpent, systemCash, actualCash, difference: actualCash.minus(systemCash) }, include });
      await tx.auditLog.create({ data: { userId, action: 'SHIFT_CLOSED', entityType: 'SHIFT', entityId: id, before: { closedAt: null }, after: { systemCash: systemCash.toString(), actualCash: actualCash.toString(), difference: shift.difference?.toString() } } });
      return shift;
    });
  }
}
