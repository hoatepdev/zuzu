import { PaymentMethod, PrismaClient, Role } from '@prisma/client';
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
  if (orderId) await prisma.order.deleteMany({ where: { id: orderId } });
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
