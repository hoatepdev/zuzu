import { OrderStatus, PaymentMethod, PrismaClient, PrintJobStatus, Role, ServiceUnit } from '@prisma/client';
import { NotificationsService } from '../src/notifications/notifications.service';
import { OrdersService } from '../src/orders/orders.service';
import { PrintingService } from '../src/printing/printing.service';
import { SettingsService } from '../src/settings/settings.service';
import { PrismaService } from '../src/prisma.service';

const prisma = new PrismaClient();
const prismaService = prisma as unknown as PrismaService;
const printing = new PrintingService(prismaService);
const notifications = { orderReady: jest.fn().mockResolvedValue(undefined) };
const orders = new OrdersService(prismaService, printing, notifications as unknown as NotificationsService, new SettingsService(prismaService));
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
  await prisma.printJob.deleteMany({ where: { order: { createdById: userId } } });
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

it('queues a receipt job on create and a fresh job on reprint, with audit', async () => {
  const created = await orders.create({ customerUnknown: true }, userId);
  const initial = await prisma.printJob.findFirstOrThrow({ where: { orderId: created.id } });
  expect(initial.status).toBe(PrintJobStatus.PENDING);
  expect(initial.type).toBe('ORDER_RECEIPT');
  expect(initial.payload).toMatchObject({ code: created.code });

  await orders.reprint(created.id, userId);
  const jobs = await prisma.printJob.findMany({ where: { orderId: created.id } });
  expect(jobs).toHaveLength(2);
  expect(jobs.some((job) => job.id === initial.id)).toBe(true);
  expect(await prisma.auditLog.count({ where: { entityId: created.id, action: 'ORDER_REPRINTED' } })).toBe(1);
});

it('keeps the order and its queued job even with no print agent online', async () => {
  const created = await orders.create({ customerUnknown: true }, userId);
  expect(created.code).toMatch(/^ZU-\d+$/);
  const job = await prisma.printJob.findFirstOrThrow({ where: { orderId: created.id } });
  expect(job.status).toBe(PrintJobStatus.PENDING);
  expect(await prisma.order.findUnique({ where: { id: created.id } })).not.toBeNull();
});
