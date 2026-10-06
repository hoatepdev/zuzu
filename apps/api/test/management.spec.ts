import { PaymentMethod, Prisma, PrismaClient, Role } from '@prisma/client';
import { DashboardService, vietnamTodayBounds } from '../src/dashboard/dashboard.service';
import { ExpensesService } from '../src/expenses/expenses.service';
import { PrismaService } from '../src/prisma.service';
import { ShiftsService } from '../src/shifts/shifts.service';

const prisma = new PrismaClient();
const db = prisma as unknown as PrismaService;
const expenses = new ExpensesService(db);
const shifts = new ShiftsService(db);
const dashboard = new DashboardService(db);
const suffix = Date.now().toString();
let managerId: string;
let shiftId: string;
let orderId: string;

beforeAll(async () => {
  managerId = (await prisma.user.create({ data: { username: `manager-${suffix}`, name: 'Manager Test', role: Role.MANAGER, passwordHash: 'unused' } })).id;
});
afterAll(async () => {
  await prisma.auditLog.deleteMany({ where: { userId: managerId } });
  await prisma.payment.deleteMany({ where: { createdById: managerId } });
  await prisma.expense.deleteMany({ where: { createdById: managerId } });
  await prisma.order.deleteMany({ where: { createdById: managerId } });
  if (shiftId) await prisma.shift.deleteMany({ where: { id: shiftId } });
  await prisma.user.delete({ where: { id: managerId } });
  await prisma.$disconnect();
});

it('uses Vietnam day boundaries', () => {
  const { start, end } = vietnamTodayBounds(new Date('2026-10-01T20:00:00Z'));
  expect(start.toISOString()).toBe('2026-10-01T17:00:00.000Z');
  expect(end.toISOString()).toBe('2026-10-02T17:00:00.000Z');
});

it('summarizes arbitrary date ranges with VN bounds', async () => {
  const summary = await dashboard.range('2026-10-01', '2026-10-01');
  expect(summary).toHaveProperty('revenue');
  await expect(dashboard.range('2026-10-02', '2026-10-01')).rejects.toThrow('Khoảng ngày không hợp lệ');
  await expect(dashboard.range('garbage', '2026-10-01')).rejects.toThrow('Khoảng ngày không hợp lệ');
});

it('creates expenses, closes one shift once, and reports dashboard totals', async () => {
  const shift = await shifts.open(managerId); shiftId = shift.id;
  await expect(shifts.open(managerId)).rejects.toThrow('Đã có ca đang mở');
  const expense = await expenses.create({ amount: 20000, category: 'Hóa chất', description: 'Test', expenseDate: new Date().toISOString(), paymentMethod: PaymentMethod.CASH }, managerId);
  expect(expense.shiftId).toBe(shift.id);
  const order = await prisma.order.create({ data: { code: `ZU-M-${suffix}`, customerUnknown: true, createdById: managerId, status: 'COMPLETED', total: 100000, completedAt: new Date() } }); orderId = order.id;
  await prisma.payment.create({ data: { orderId: order.id, amount: 100000, method: PaymentMethod.CASH, createdById: managerId, shiftId: shift.id } });
  const closed = await shifts.close(shift.id, 79000, managerId);
  expect(closed.systemCash?.toString()).toBe('80000');
  expect(closed.difference?.toString()).toBe('-1000');
  await expect(shifts.close(shift.id, 80000, managerId)).rejects.toThrow('Ca không tồn tại hoặc đã chốt');
  const today = await dashboard.today();
  expect(Number(today.revenue)).toBeGreaterThanOrEqual(100000);
  expect(Number(today.expenses)).toBeGreaterThanOrEqual(20000);
  expect(await prisma.auditLog.count({ where: { userId: managerId, entityType: { in: ['SHIFT', 'EXPENSE'] } } })).toBe(3);
});

it('groups daily analytics in Vietnam timezone with zero-fill, previous period, and range limits', async () => {
  const order = (data: Omit<Prisma.OrderUncheckedCreateInput, 'createdById'>) => prisma.order.create({ data: { ...data, createdById: managerId } });
  const payment = (data: Omit<Prisma.PaymentUncheckedCreateInput, 'createdById'>) => prisma.payment.create({ data: { ...data, createdById: managerId } });

  // current range 2026-03-01 → 2026-03-03, previous 2026-02-26 → 2026-02-28
  // created before range, completed 2026-03-01 VN → kg counts, order count does not
  const carried = await order({ code: `ZU-D1-${suffix}`, status: 'COMPLETED', createdAt: new Date('2026-02-20T10:00:00Z'), completedAt: new Date('2026-03-01T02:00:00Z'), weight: 5, total: 500000 });
  // 2026-02-28T17:30Z = 2026-03-01 00:30 VN → revenue of 2026-03-01
  await payment({ orderId: carried.id, amount: 500000, method: PaymentMethod.BANK_TRANSFER, createdAt: new Date('2026-02-28T17:30:00Z') });
  // created 2026-03-02 VN
  await order({ code: `ZU-D2-${suffix}`, status: 'PROCESSING', createdAt: new Date('2026-03-02T10:00:00Z') });
  // created 2026-03-03 01:30 VN (UTC boundary)
  await order({ code: `ZU-D3-${suffix}`, status: 'COMPLETED', createdAt: new Date('2026-03-02T18:30:00Z') });
  // cancelled → excluded from counts
  await order({ code: `ZU-D4-${suffix}`, status: 'CANCELLED', createdAt: new Date('2026-03-02T05:00:00Z') });
  // voided expense → excluded
  await prisma.expense.create({ data: { amount: 999000, category: 'Khác', description: 'voided', expenseDate: new Date('2026-03-02T06:00:00Z'), paymentMethod: PaymentMethod.CASH, createdById: managerId, voidedAt: new Date('2026-03-03T00:00:00Z') } });
  await prisma.expense.create({ data: { amount: 200000, category: 'Điện', description: 'ok', expenseDate: new Date('2026-03-02T04:00:00Z'), paymentMethod: PaymentMethod.CASH, createdById: managerId } });
  // previous period records
  const prevOrder = await order({ code: `ZU-D5-${suffix}`, status: 'COMPLETED', createdAt: new Date('2026-02-27T09:00:00Z') });
  await payment({ orderId: prevOrder.id, amount: 300000, method: PaymentMethod.CASH, createdAt: new Date('2026-02-27T10:00:00Z') });
  await prisma.expense.create({ data: { amount: 100000, category: 'Nước', description: 'prev', expenseDate: new Date('2026-02-26T02:00:00Z'), paymentMethod: PaymentMethod.CASH, createdById: managerId } });

  const summary = await dashboard.range('2026-03-01', '2026-03-03');
  expect(summary.daily.map((day) => day.date)).toEqual(['2026-03-01', '2026-03-02', '2026-03-03']);
  expect(summary.daily[0]).toMatchObject({ revenue: '500000', expenses: '0', estimatedProfit: '500000', orders: 0, kg: '5' });
  expect(summary.daily[1]).toMatchObject({ revenue: '0', expenses: '200000', estimatedProfit: '-200000', orders: 1, kg: '0' });
  // D3 created 2026-03-02T18:30Z = 2026-03-03 01:30 VN; zero revenue day still shows the order
  expect(summary.daily[2]).toMatchObject({ revenue: '0', expenses: '0', estimatedProfit: '0', orders: 1, kg: '0' });
  expect(Number(summary.revenue)).toBe(500000);
  expect(Number(summary.expenses)).toBe(200000);
  expect(Number(summary.estimatedProfit)).toBe(300000);
  expect(summary.orders).toBe(2);
  expect(Number(summary.kg)).toBe(5);
  expect(summary.bankTransfer.toString()).toBe('500000');
  expect(summary).toHaveProperty('processing');
  expect(summary).toHaveProperty('unpaid');
  expect(summary.previous).toEqual({ revenue: '300000', expenses: '100000', estimatedProfit: '200000', orders: 1 });

  await expect(dashboard.range('2026-01-01', '2027-01-01')).resolves.toBeDefined();
  await expect(dashboard.range('2026-01-01', '2027-01-02')).rejects.toThrow('tối đa 366');
  await expect(dashboard.range('2026-03-03', '2026-03-01')).rejects.toThrow('Khoảng ngày không hợp lệ');
  await expect(dashboard.range('2026-02-30', '2026-03-01')).rejects.toThrow('Khoảng ngày không hợp lệ');
});
