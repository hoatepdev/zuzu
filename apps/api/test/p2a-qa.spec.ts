import { BadRequestException } from '@nestjs/common';
import { OrderStatus, PaymentMethod, PrismaClient, Role, ServiceUnit } from '@prisma/client';
import { NotificationsService } from '../src/notifications/notifications.service';
import { OrdersService } from '../src/orders/orders.service';
import { PrintingService } from '../src/printing/printing.service';
import { SettingsService } from '../src/settings/settings.service';
import { PrismaService } from '../src/prisma.service';

const prisma = new PrismaClient();
const prismaService = prisma as unknown as PrismaService;
const printing = new PrintingService(prismaService);
const orderReady = jest.fn().mockResolvedValue(undefined);
const notifications = { orderReady } as unknown as NotificationsService;
const orders = new OrdersService(prismaService, printing, notifications, new SettingsService(prismaService));
const suffix = Date.now().toString();

let staffId: string;
let kgServiceId: string;
let itemServiceId: string;

beforeAll(async () => {
  await prisma.storeSetting.upsert({ where: { key: 'LOYALTY_VND_PER_POINT' }, update: { value: '10000' }, create: { key: 'LOYALTY_VND_PER_POINT', value: '10000' } });
  staffId = (await prisma.user.create({ data: { username: `qa-${suffix}`, name: 'QA', role: Role.STAFF, passwordHash: 'unused' } })).id;
  kgServiceId = (await prisma.service.create({ data: { name: `QA giặt thường ${suffix}`, unit: ServiceUnit.KG, price: 15000 } })).id;
  itemServiceId = (await prisma.service.create({ data: { name: `QA chăn ${suffix}`, unit: ServiceUnit.ITEM, price: 80000 } })).id;
});

afterAll(async () => {
  await prisma.auditLog.deleteMany({ where: { userId: staffId } });
  await prisma.payment.deleteMany({ where: { createdById: staffId } });
  await prisma.loyaltyTransaction.deleteMany({ where: { customer: { phone: { contains: suffix.slice(-6) } } } });
  await prisma.printJob.deleteMany({ where: { order: { createdById: staffId } } });
  await prisma.orderItem.deleteMany({ where: { orderId: { in: (await prisma.order.findMany({ where: { createdById: staffId }, select: { id: true } })).map((o) => o.id) } } });
  await prisma.customer.deleteMany({ where: { phone: { contains: suffix.slice(-6) } } });
  await prisma.order.deleteMany({ where: { createdById: staffId } });
  await prisma.service.deleteMany({ where: { id: { in: [kgServiceId, itemServiceId] } } });
  await prisma.user.delete({ where: { id: staffId } });
  await prisma.$disconnect();
});

it('case 2: price edit keeps baseUnitPrice, recalculates lineTotal, and audits old/new price', async () => {
  const created = await orders.create({ customerUnknown: true }, staffId);
  const ready = await orders.complete(created.id, { items: [{ serviceId: itemServiceId, quantity: 1 }] }, staffId, Role.MANAGER);
  const item = ready.items[0];
  expect(item.baseUnitPrice.toString()).toBe('80000');

  const edited = await orders.complete(created.id, { items: [{ id: item.id, serviceId: itemServiceId, quantity: 1, unitPrice: 70000 }] }, staffId, Role.MANAGER);
  const editedItem = edited.items[0];
  expect(editedItem.baseUnitPrice.toString()).toBe('80000');
  expect(editedItem.unitPrice.toString()).toBe('70000');
  expect(editedItem.lineTotal.toString()).toBe('70000');

  const audit = await prisma.auditLog.findFirst({ where: { entityId: created.id, action: 'ORDER_ADJUSTED' }, orderBy: { createdAt: 'desc' } });
  const before = (audit!.before as { items: Array<{ unitPrice: string }> }).items[0];
  const after = (audit!.after as { items: Array<{ unitPrice: string; baseUnitPrice: string }> }).items[0];
  expect(before.unitPrice).toBe('80000');
  expect(after.unitPrice).toBe('70000');
  expect(after.baseUnitPrice).toBe('80000');
});

it('case 3: staff cannot change discount, manager and owner can', async () => {
  const created = await orders.create({ customerUnknown: true }, staffId);
  const ready = await orders.complete(created.id, { items: [{ serviceId: kgServiceId, quantity: 4.2 }, { serviceId: itemServiceId, quantity: 1 }] }, staffId, Role.MANAGER);
  expect(ready.subtotal!.toString()).toBe('143000');

  const itemInput = ready.items.map((item) => ({ id: item.id, serviceId: item.serviceId, quantity: Number(item.quantity) }));
  await expect(orders.complete(created.id, { items: itemInput, discount: 10000 }, staffId, Role.STAFF)).rejects.toThrow(BadRequestException);
  const managerDone = await orders.complete(created.id, { items: itemInput, discount: 10000, expectedUpdatedAt: (await orders.get(created.id)).updatedAt.toISOString() }, staffId, Role.MANAGER);
  expect(managerDone.discount.toString()).toBe('10000');
  expect(managerDone.total!.toString()).toBe('133000');

  const refreshed = (await orders.get(created.id)).updatedAt.toISOString();
  const ownerDone = await orders.complete(created.id, { items: itemInput, discount: 20000, expectedUpdatedAt: refreshed }, staffId, Role.OWNER);
  expect(ownerDone.discount.toString()).toBe('20000');
  expect(ownerDone.total!.toString()).toBe('123000');
});

it('case 4: existing items keep their baseUnitPrice snapshot after the service price changes', async () => {
  const created = await orders.create({ customerUnknown: true }, staffId);
  const ready = await orders.complete(created.id, { items: [{ serviceId: kgServiceId, quantity: 1 }] }, staffId, Role.MANAGER);
  const item = ready.items[0];
  expect(item.baseUnitPrice.toString()).toBe('15000');

  await prisma.service.update({ where: { id: kgServiceId }, data: { price: 17000 } });
  try {
    const qtyEdited = await orders.complete(created.id, { items: [{ id: item.id, serviceId: kgServiceId, quantity: 2 }] }, staffId, Role.MANAGER);
    expect(qtyEdited.items[0].baseUnitPrice.toString()).toBe('15000');

    const withNew = await orders.complete(created.id, { items: [{ id: item.id, serviceId: kgServiceId, quantity: 2 }, { serviceId: kgServiceId, quantity: 1 }] }, staffId, Role.MANAGER);
    expect(withNew.items.find((i) => !i.id)?.baseUnitPrice.toString()).toBeUndefined();
    const newLine = withNew.items.find((i) => Number(i.quantity) === 1)!;
    expect(newLine.baseUnitPrice.toString()).toBe('17000');
    expect(withNew.subtotal!.toString()).toBe('47000');
  } finally {
    await prisma.service.update({ where: { id: kgServiceId }, data: { price: 15000 } });
  }
});

it('case 5: READY_FOR_PICKUP correction is allowed unpaid, recalculates totals, and does not re-notify', async () => {
  orderReady.mockClear();
  const created = await orders.create({ customerUnknown: true }, staffId);
  const ready = await orders.complete(created.id, { items: [{ serviceId: kgServiceId, quantity: 4.2 }] }, staffId, Role.MANAGER);
  expect(ready.status).toBe(OrderStatus.READY_FOR_PICKUP);
  expect(orderReady).toHaveBeenCalledTimes(1);

  const corrected = await orders.complete(created.id, { items: [{ id: ready.items[0].id, serviceId: itemServiceId, quantity: 3, unitPrice: 60000 }] }, staffId, Role.MANAGER);
  expect(corrected.status).toBe(OrderStatus.READY_FOR_PICKUP);
  expect(corrected.subtotal!.toString()).toBe('180000');
  expect(corrected.weight!.toString()).toBe('0');
  expect(orderReady).toHaveBeenCalledTimes(1);
});

it('case 6: paid (COMPLETED) and cancelled orders reject every financial edit', async () => {
  const paid = await orders.create({ customerUnknown: true }, staffId);
  const readyPaid = await orders.complete(paid.id, { items: [{ serviceId: kgServiceId, quantity: 2 }] }, staffId, Role.MANAGER);
  await orders.attachCustomer(paid.id, { phone: `09${suffix.slice(-8)}`, name: 'QA lock' }, staffId);
  await orders.returnOrder(paid.id, { method: PaymentMethod.CASH }, staffId);
  const paidOrder = await orders.get(paid.id);
  const paidItem = paidOrder.items[0];
  const paidInput = [{ id: paidItem.id, serviceId: paidItem.serviceId, quantity: Number(paidItem.quantity) }];
  await expect(orders.complete(paid.id, { items: [...paidInput, { serviceId: itemServiceId, quantity: 1 }] }, staffId, Role.MANAGER)).rejects.toThrow(BadRequestException);
  await expect(orders.complete(paid.id, { items: [{ ...paidInput[0], quantity: 5 }] }, staffId, Role.MANAGER)).rejects.toThrow(BadRequestException);
  await expect(orders.complete(paid.id, { items: [{ ...paidInput[0], unitPrice: 1000 }] }, staffId, Role.MANAGER)).rejects.toThrow(BadRequestException);
  await expect(orders.complete(paid.id, { items: paidInput, discount: 1000 }, staffId, Role.MANAGER)).rejects.toThrow(BadRequestException);
  await expect(orders.cancel(paid.id, 'QA huỷ sau trả', staffId)).rejects.toThrow('Chỉ có thể huỷ đơn chưa thanh toán');

  const cancelled = await orders.create({ customerUnknown: true }, staffId);
  await orders.cancel(cancelled.id, 'QA huỷ trước trả', staffId);
  const cancelledOrder = await orders.get(cancelled.id);
  expect(cancelledOrder.status).toBe(OrderStatus.CANCELLED);
  await expect(orders.complete(cancelled.id, { items: [{ serviceId: kgServiceId, quantity: 1 }] }, staffId, Role.MANAGER)).rejects.toThrow('Chỉ đơn đang xử lý');
});

it('case 7: stale expectedUpdatedAt never silently overwrites', async () => {
  const created = await orders.create({ customerUnknown: true }, staffId);
  const ready = await orders.complete(created.id, { items: [{ serviceId: kgServiceId, quantity: 1 }] }, staffId, Role.MANAGER);
  const stale = ready.updatedAt;
  await orders.complete(created.id, { items: [{ id: ready.items[0].id, serviceId: kgServiceId, quantity: 3 }] }, staffId, Role.MANAGER);
  await expect(orders.complete(created.id, { expectedUpdatedAt: stale.toISOString(), items: [{ id: ready.items[0].id, serviceId: kgServiceId, quantity: 9 }] }, staffId, Role.MANAGER)).rejects.toThrow('Đơn đã được cập nhật ở thiết bị khác. Vui lòng tải lại.');
});
