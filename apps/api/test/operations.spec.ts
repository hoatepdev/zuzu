import { OrderStatus, PaymentMethod, PrismaClient, Role, ServiceUnit } from '@prisma/client';
import { CustomersService } from '../src/customers/customers.service';
import { NotificationsService } from '../src/notifications/notifications.service';
import { OrdersService } from '../src/orders/orders.service';
import { PrintingService } from '../src/printing/printing.service';
import { PrismaService } from '../src/prisma.service';
import { ServicesService } from '../src/services/services.service';
import { SettingsService } from '../src/settings/settings.service';

const prisma = new PrismaClient();
const db = prisma as unknown as PrismaService;
const notifications = { orderReady: jest.fn().mockResolvedValue(undefined) };
const orders = new OrdersService(db, new PrintingService(db), notifications as unknown as NotificationsService, new SettingsService(db));
const customers = new CustomersService(db);
const services = new ServicesService(db);
const suffix = Date.now().toString();
let managerId: string;
let serviceId: string;
let customerId: string;
let customer2Id: string;
const orderIds: string[] = [];

beforeAll(async () => {
  await prisma.storeSetting.upsert({ where: { key: 'LOYALTY_VND_PER_POINT' }, update: { value: '10000' }, create: { key: 'LOYALTY_VND_PER_POINT', value: '10000' } });
  managerId = (await prisma.user.create({ data: { username: `ops-${suffix}`, name: 'Ops Manager', role: Role.MANAGER, passwordHash: 'unused' } })).id;
  serviceId = (await services.create({ name: `Giặt test ${suffix}`, unit: ServiceUnit.KG, price: 15000 }, managerId)).id;
});
afterAll(async () => {
  await prisma.auditLog.deleteMany({ where: { userId: managerId } });
  await prisma.payment.deleteMany({ where: { orderId: { in: orderIds } } });
  await prisma.loyaltyTransaction.deleteMany({ where: { OR: [{ orderId: { in: orderIds } }, { customerId: { in: [customerId, customer2Id].filter(Boolean) } }] } });
  await prisma.notification.deleteMany({ where: { orderId: { in: orderIds } } });
  await prisma.printJob.deleteMany({ where: { orderId: { in: orderIds } } });
  await prisma.orderItem.deleteMany({ where: { orderId: { in: orderIds } } });
  await prisma.order.deleteMany({ where: { id: { in: orderIds } } });
  if (customerId) await prisma.customer.delete({ where: { id: customerId } });
  if (customer2Id) await prisma.customer.delete({ where: { id: customer2Id } });
  await prisma.service.delete({ where: { id: serviceId } });
  await prisma.user.delete({ where: { id: managerId } });
  await prisma.$disconnect();
});

it('cancels eligible orders once and audits the change', async () => {
  const order = await orders.create({ customerUnknown: true }, managerId); orderIds.push(order.id);
  const cancelled = await orders.cancel(order.id, 'Nhận nhầm túi', managerId);
  expect(cancelled.status).toBe(OrderStatus.CANCELLED);
  await expect(orders.cancel(order.id, 'Huỷ lần nữa', managerId)).rejects.toThrow('Chỉ có thể huỷ đơn chưa thanh toán');
  expect(await prisma.auditLog.count({ where: { entityId: order.id, action: 'ORDER_CANCELLED' } })).toBe(1);
  await expect(orders.attachCustomer(order.id, { phone: '0900000001' }, managerId)).rejects.toThrow('Không thể gắn khách');
});

it('preserves customer names and service snapshots while exposing CRM history', async () => {
  const phone = `09${suffix.slice(-8)}`;
  const first = await orders.create({ phone, customerName: 'Tên đúng', customerUnknown: false }, managerId); orderIds.push(first.id); customerId = first.customerId!;
  const second = await orders.create({ phone, customerName: 'Tên nhập nhầm', customerUnknown: false }, managerId); orderIds.push(second.id);
  expect(second.customer?.name).toBe('Tên đúng');
  await orders.complete(first.id, { serviceId, quantity: 2 }, managerId);
  await orders.returnOrder(first.id, { method: PaymentMethod.CASH }, managerId);
  const item = await prisma.orderItem.findFirstOrThrow({ where: { orderId: first.id } });
  await services.update(serviceId, { price: 20000, active: false }, managerId);
  expect((await prisma.orderItem.findUniqueOrThrow({ where: { id: item.id } })).unitPrice.toString()).toBe('15000');
  expect((await services.active()).some((service) => service.id === serviceId)).toBe(false);
  const found = await customers.search(phone.replace(/(\d{2})(\d+)/, '$1 $2'));
  expect(found[0].id).toBe(customerId);
  const detail = await customers.get(customerId);
  expect(detail.orders).toHaveLength(2);
  expect(detail.loyalty[0].points).toBe(3);
  const updated = await customers.update(customerId, { note: 'Ưu tiên ít thơm', marketingOptIn: true }, managerId);
  expect(updated.note).toBe('Ưu tiên ít thơm');
});

it('adjusts weighing with discount before payment and applies manual loyalty', async () => {
  await services.update(serviceId, { active: true, price: 15000 }, managerId);
  const order = await orders.create({ phone: `098${suffix.slice(-6)}`, customerName: 'Khách sửa cân', customerUnknown: false }, managerId); orderIds.push(order.id); customer2Id = order.customerId!;
  const notify = notifications.orderReady as jest.Mock;
  const before = notify.mock.calls.length;
  const first = await orders.complete(order.id, { serviceId, quantity: 2 }, managerId);
  expect(first.subtotal?.toString()).toBe('30000');
  expect(first.total?.toString()).toBe('30000');
  expect(notify.mock.calls.length).toBe(before + 1);
  const adjust = await orders.complete(order.id, { serviceId, quantity: 2, discount: 5000 }, managerId);
  expect(adjust.subtotal?.toString()).toBe('30000');
  expect(adjust.total?.toString()).toBe('25000');
  expect(adjust.readyAt?.toISOString()).toBe(first.readyAt?.toISOString());
  expect(adjust.payments).toHaveLength(0);
  expect(notify.mock.calls.length).toBe(before + 2);
  await expect(orders.complete(order.id, { serviceId, quantity: 1, discount: 99000 }, managerId)).rejects.toThrow('Giảm giá vượt thành tiền');
  const returned = await orders.returnOrder(order.id, { method: PaymentMethod.BANK_TRANSFER }, managerId);
  expect(returned.status).toBe(OrderStatus.COMPLETED);
  const ledger = await prisma.loyaltyTransaction.findMany({ where: { customerId: customer2Id } });
  expect(ledger.find((row) => row.type === 'ORDER')?.points).toBe(2);
  await customers.loyaltyAdjust(customer2Id, 5, 'Đền bù thiếu điểm', managerId);
  const minus = await customers.loyaltyAdjust(customer2Id, -2, 'Trừ nhầm', managerId);
  expect(minus.totalPoints).toBe(5);
  const sum = (await prisma.loyaltyTransaction.aggregate({ where: { customerId: customer2Id }, _sum: { points: true } }))._sum.points;
  expect(sum).toBe(minus.totalPoints);
  expect(await prisma.auditLog.count({ where: { entityId: order.id, action: 'ORDER_ADJUSTED' } })).toBe(1);
  expect(await prisma.auditLog.count({ where: { entityId: customer2Id, action: 'LOYALTY_ADJUSTED' } })).toBe(2);
});
