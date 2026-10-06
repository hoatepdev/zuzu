import { BadRequestException, Injectable } from '@nestjs/common';
import { OrderStatus, PaymentMethod, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma.service';

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const MAX_RANGE_DAYS = 366;
const DAY_KEY_RE = /^\d{4}-\d{2}-\d{2}$/;

export function vietnamTodayBounds(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
  const start = new Date(`${parts}T00:00:00+07:00`);
  return { start, end: new Date(start.getTime() + MS_PER_DAY) };
}

// ponytail: fixed 24h stepping is safe because Vietnam has no DST
function vietnamDateKey(date: Date) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
}

// exact YYYY-MM-DD; roundtrip check rejects values JS would normalize (e.g. 2026-02-30)
function parseVietnamDay(value: string) {
  if (!DAY_KEY_RE.test(value)) return null;
  const start = new Date(`${value}T00:00:00+07:00`);
  if (Number.isNaN(start.getTime()) || vietnamDateKey(start) !== value) return null;
  return start;
}

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}
  today() { return this.summarize(vietnamTodayBounds()); }

  async range(from: string, to: string) {
    const start = parseVietnamDay(from);
    const endDay = parseVietnamDay(to);
    const endExclusive = endDay && new Date(endDay.getTime() + MS_PER_DAY);
    const days = start && endExclusive ? Math.round((endExclusive.getTime() - start.getTime()) / MS_PER_DAY) : 0;
    if (!start || !endExclusive || days < 1) throw new BadRequestException('Khoảng ngày không hợp lệ');
    if (days > MAX_RANGE_DAYS) throw new BadRequestException(`Khoảng ngày tối đa ${MAX_RANGE_DAYS} ngày`);
    const prevStart = new Date(start.getTime() - days * MS_PER_DAY);
    const combined = { gte: prevStart, lt: endExclusive };
    const current = { gte: start, lt: endExclusive };
    const [payments, expenses, orders, processing, ready, unpaidOrders, completedCustomers] = await Promise.all([
      this.prisma.payment.findMany({ where: { createdAt: combined }, select: { createdAt: true, method: true, amount: true } }),
      this.prisma.expense.findMany({ where: { expenseDate: combined, voidedAt: null }, select: { expenseDate: true, amount: true } }),
      this.prisma.order.findMany({ where: { OR: [{ createdAt: combined }, { completedAt: current }] }, select: { createdAt: true, completedAt: true, status: true, weight: true } }),
      this.prisma.order.count({ where: { status: OrderStatus.PROCESSING } }),
      this.prisma.order.count({ where: { status: OrderStatus.READY_FOR_PICKUP } }),
      this.prisma.order.findMany({ where: { status: OrderStatus.READY_FOR_PICKUP, total: { not: null }, payments: { none: {} } }, select: { total: true } }),
      this.prisma.order.findMany({ where: { completedAt: current, customerId: { not: null } }, distinct: ['customerId'], select: { customerId: true, customer: { select: { firstOrderAt: true } } } })
    ]);

    const zero = () => new Prisma.Decimal(0);
    const buckets = new Map<string, { revenue: Prisma.Decimal; expenses: Prisma.Decimal; orders: number; kg: Prisma.Decimal }>();
    for (let i = 0; i < days; i++) {
      buckets.set(vietnamDateKey(new Date(start.getTime() + i * MS_PER_DAY)), { revenue: zero(), expenses: zero(), orders: 0, kg: zero() });
    }
    const bucket = (date: Date) => buckets.get(vietnamDateKey(date));

    let cash = zero();
    let bankTransfer = zero();
    let prevRevenue = zero();
    for (const payment of payments) {
      if (payment.createdAt < start) { prevRevenue = prevRevenue.plus(payment.amount); continue; }
      if (payment.method === PaymentMethod.CASH) cash = cash.plus(payment.amount);
      else if (payment.method === PaymentMethod.BANK_TRANSFER) bankTransfer = bankTransfer.plus(payment.amount);
      const day = bucket(payment.createdAt);
      if (day) day.revenue = day.revenue.plus(payment.amount);
    }

    let expenseTotal = zero();
    let prevExpenses = zero();
    for (const expense of expenses) {
      if (expense.expenseDate < start) { prevExpenses = prevExpenses.plus(expense.amount); continue; }
      expenseTotal = expenseTotal.plus(expense.amount);
      const day = bucket(expense.expenseDate);
      if (day) day.expenses = day.expenses.plus(expense.amount);
    }

    let orderCount = 0;
    let prevOrders = 0;
    let kg = zero();
    for (const order of orders) {
      if (order.status !== OrderStatus.CANCELLED) {
        if (order.createdAt >= start) {
          orderCount++;
          const day = bucket(order.createdAt);
          if (day) day.orders++;
        } else if (order.createdAt >= prevStart) {
          prevOrders++;
        }
      }
      if (order.completedAt && order.completedAt >= start && order.completedAt < endExclusive) {
        const weight = order.weight ?? zero();
        kg = kg.plus(weight);
        const day = bucket(order.completedAt);
        if (day) day.kg = day.kg.plus(weight);
      }
    }

    const revenue = cash.plus(bankTransfer);
    const unpaid = unpaidOrders.reduce((sum, order) => sum.plus(order.total ?? 0), zero());
    const newCustomers = completedCustomers.filter((order) => order.customer?.firstOrderAt && order.customer.firstOrderAt >= start).length;
    return {
      revenue,
      expenses: expenseTotal,
      estimatedProfit: revenue.minus(expenseTotal),
      orders: orderCount,
      kg,
      processing,
      ready,
      cash,
      bankTransfer,
      unpaid,
      newCustomers,
      returningCustomers: completedCustomers.length - newCustomers,
      daily: [...buckets.entries()].map(([date, day]) => ({
        date,
        revenue: day.revenue.toString(),
        expenses: day.expenses.toString(),
        estimatedProfit: day.revenue.minus(day.expenses).toString(),
        orders: day.orders,
        kg: day.kg.toString()
      })),
      previous: {
        revenue: prevRevenue.toString(),
        expenses: prevExpenses.toString(),
        estimatedProfit: prevRevenue.minus(prevExpenses).toString(),
        orders: prevOrders
      }
    };
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
