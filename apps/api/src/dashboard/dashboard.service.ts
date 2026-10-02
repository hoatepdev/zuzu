import { BadRequestException, Injectable } from '@nestjs/common';
import { OrderStatus, PaymentMethod, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma.service';

export function vietnamTodayBounds(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
  const start = new Date(`${parts}T00:00:00+07:00`);
  return { start, end: new Date(start.getTime() + 24 * 60 * 60 * 1000) };
}
@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}
  today() { return this.summarize(vietnamTodayBounds()); }
  async range(from: string, to: string) {
    const start = new Date(`${from}T00:00:00+07:00`);
    const end = new Date(new Date(`${to}T00:00:00+07:00`).getTime() + 24 * 60 * 60 * 1000);
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || end <= start) throw new BadRequestException('Khoảng ngày không hợp lệ');
    return this.summarize({ start, end });
  }
  private async summarize({ start, end }: { start: Date; end: Date }) {
    const range = { gte: start, lt: end };
    const [payments, expenses, orders, weight, processing, ready, unpaidOrders, completedCustomers] = await Promise.all([
      this.prisma.payment.groupBy({ by: ['method'], where: { createdAt: range }, _sum: { amount: true } }),
      this.prisma.expense.aggregate({ where: { expenseDate: range, voidedAt: null }, _sum: { amount: true } }),
      this.prisma.order.count({ where: { createdAt: range, status: { not: OrderStatus.CANCELLED } } }),
      this.prisma.order.aggregate({ where: { completedAt: range }, _sum: { weight: true } }),
      this.prisma.order.count({ where: { status: OrderStatus.PROCESSING } }),
      this.prisma.order.count({ where: { status: OrderStatus.READY_FOR_PICKUP } }),
      this.prisma.order.findMany({ where: { status: OrderStatus.READY_FOR_PICKUP, total: { not: null }, payments: { none: {} } }, select: { total: true } }),
      this.prisma.order.findMany({ where: { completedAt: range, customerId: { not: null } }, distinct: ['customerId'], select: { customerId: true, customer: { select: { firstOrderAt: true } } } })
    ]);
    const cash = payments.find((payment) => payment.method === PaymentMethod.CASH)?._sum.amount ?? new Prisma.Decimal(0);
    const bankTransfer = payments.find((payment) => payment.method === PaymentMethod.BANK_TRANSFER)?._sum.amount ?? new Prisma.Decimal(0);
    const revenue = cash.plus(bankTransfer);
    const expenseTotal = expenses._sum.amount ?? new Prisma.Decimal(0);
    const unpaid = unpaidOrders.reduce((sum, order) => sum.plus(order.total ?? 0), new Prisma.Decimal(0));
    const newCustomers = completedCustomers.filter((order) => order.customer?.firstOrderAt && order.customer.firstOrderAt >= start).length;
    return { revenue, expenses: expenseTotal, estimatedProfit: revenue.minus(expenseTotal), orders, kg: weight._sum.weight ?? new Prisma.Decimal(0), processing, ready, cash, bankTransfer, unpaid, newCustomers, returningCustomers: completedCustomers.length - newCustomers };
  }
}
