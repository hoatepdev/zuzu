import { OrderStatus, PaymentMethod, PrismaClient, Role, ServiceUnit } from '@prisma/client';
import { NotificationsService } from '../src/notifications/notifications.service';
import { OrdersService } from '../src/orders/orders.service';
import { SettingsService } from '../src/settings/settings.service';
import { PrismaService } from '../src/prisma.service';

const prisma = new PrismaClient();
const prismaService = prisma as unknown as PrismaService;
const printing = { print: jest.fn().mockResolvedValue(undefined) };
const notifications = { orderReady: jest.fn().mockResolvedValue(undefined) };
const orders = new OrdersService(prismaService, printing as never, notifications as unknown as NotificationsService, new SettingsService(prismaService));
const suffix = Date.now().toString();
let userId: string;
let serviceId: string;

beforeAll(async () => {
  await prisma.storeSetting.upsert({ where: { key: 'LOYALTY_VND_PER_POINT' }, update: { value: '10000' }, create: { key: 'LOYALTY_VND_PER_POINT', value: '10000' } });
  userId = (await prisma.user.create({ data: { username: `test-${suffix}`, name: 'Test', role: Role.STAFF, passwordHash: 'unused' } })).id;
  serviceId = (await prisma.service.create({ data: { name: `Test service ${suffix}`, unit: ServiceUnit.KG, price: 15000 } })).id;
  await prisma.storeSetting.upsert({ where: { key: 'LOYALTY_VND_PER_POINT' }, update: { value: '10000' }, create: { key: 'LOYALTY_VND_PER_POINT', value: '10000' } });
});

afterAll(async () => {
  await prisma.auditLog.deleteMany({ where: { userId } });
  await prisma.payment.deleteMany({ where: { createdById: userId } });
  await prisma.loyaltyTransaction.deleteMany({ where: { customer: { phone: `09${suffix.slice(-8)}` } } });
  await prisma.orderItem.deleteMany({ where: { serviceId } });
  await prisma.order.deleteMany({ where: { createdById: userId } });
  await prisma.customer.deleteMany({ where: { phone: `09${suffix.slice(-8)}` } });
  await prisma.service.delete({ where: { id: serviceId } });
  await prisma.user.delete({ where: { id: userId } });
  await prisma.$disconnect();
});

it('runs unknown customer through attach, complete, payment, loyalty and audit', async () => {
  const created = await orders.create({ customerUnknown: true, note: 'Ít thơm' }, userId);
  expect(created.status).toBe(OrderStatus.PROCESSING);
  expect(created.weight).toBeNull();
  expect(created.customerId).toBeNull();

  const phone = `09${suffix.slice(-8)}`;
  const attached = await orders.attachCustomer(created.id, { phone, name: 'Khách test' }, userId);
  expect(attached.customer?.phone).toBe(phone);

  const ready = await orders.complete(created.id, { serviceId, quantity: 5.2 }, userId);
  expect(ready.status).toBe(OrderStatus.READY_FOR_PICKUP);
  expect(ready.total?.toString()).toBe('78000');
  expect(ready.items[0].unitPrice.toString()).toBe('15000');

  const returned = await orders.returnOrder(created.id, { method: PaymentMethod.BANK_TRANSFER }, userId);
  expect(returned.status).toBe(OrderStatus.COMPLETED);
  expect(returned.payments[0].method).toBe(PaymentMethod.BANK_TRANSFER);
  expect(await prisma.loyaltyTransaction.findUnique({ where: { orderId: created.id } })).toMatchObject({ points: 7 });
  expect(await prisma.auditLog.count({ where: { entityId: created.id } })).toBe(4);
  await expect(orders.returnOrder(created.id, { method: PaymentMethod.CASH }, userId)).rejects.toThrow('Đơn chưa sẵn sàng để trả');
});
