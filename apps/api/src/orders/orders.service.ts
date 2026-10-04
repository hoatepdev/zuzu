import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { OrderStatus, Prisma, Role, ServiceUnit } from '@prisma/client';
import { PrismaService } from '../prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PrintingService } from '../printing/printing.service';
import { SettingsService } from '../settings/settings.service';
import { vietnamTodayBounds } from '../dashboard/dashboard.service';
import { AttachCustomerDto, CompleteOrderDto, CreateOrderDto, ListOrdersDto, ListOrdersPageDto, ReturnOrderDto } from './orders.dto';
import { calculateLineTotal, calculatePoints } from './money';

const details = { customer: true, createdBy: { select: { id: true, name: true } }, returnedBy: { select: { id: true, name: true } }, items: true, payments: true, notifications: { orderBy: { createdAt: 'desc' as const } }, printJobs: { select: { id: true, status: true, attempts: true, lastError: true, createdAt: true, printedAt: true, failedAt: true }, orderBy: { createdAt: 'desc' as const } } };
const localDate = (value?: string) => {
  if (!value) return undefined;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return new Date('invalid');
  const [year, month, day] = value.split('-').map(Number);
  const calendar = new Date(Date.UTC(year, month - 1, day));
  if (calendar.getUTCFullYear() !== year || calendar.getUTCMonth() !== month - 1 || calendar.getUTCDate() !== day) return new Date('invalid');
  return new Date(`${value}T00:00:00+07:00`);
};
const normalizePhone = (phone: string) => phone.replace(/\s/g, '');
const normalizeName = (value: string) => value
  .normalize('NFD')
  .replace(/[̀-ͯ]/g, '')
  .replace(/đ/gi, 'd')
  .toLowerCase()
  .trim()
  .replace(/\s+/g, ' ');

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(private readonly prisma: PrismaService, private readonly printing: PrintingService, private readonly notifications: NotificationsService, private readonly settings: SettingsService) {}

  async create(dto: CreateOrderDto, userId: string) {
    if (!dto.customerUnknown && !dto.phone) throw new BadRequestException('Vui lòng nhập số điện thoại');
    try {
      return await this.prisma.$transaction(async (tx) => {
        const serviceIds = [...new Set(dto.serviceIds ?? [])];
        const services = serviceIds.length
          ? await tx.service.findMany({ where: { id: { in: serviceIds }, active: true }, select: { id: true, name: true } })
          : [];
        if (services.length !== serviceIds.length) throw new BadRequestException('Dịch vụ không còn hoạt động');
        const receivedServices = serviceIds.map((id) => ({ serviceId: id, serviceName: services.find((service) => service.id === id)!.name }));
        const customer = dto.customerUnknown ? null : dto.customerId
          ? await tx.customer.findUnique({ where: { id: dto.customerId } })
          : await tx.customer.upsert({
            where: { phone: normalizePhone(dto.phone!) },
            update: dto.customerName ? { name: dto.customerName, nameNormalized: normalizeName(dto.customerName), address: dto.customerAddress } : {},
            create: { phone: normalizePhone(dto.phone!), name: dto.customerName, nameNormalized: dto.customerName ? normalizeName(dto.customerName) : undefined, address: dto.customerAddress },
          });
        if (!dto.customerUnknown && !customer) throw new BadRequestException('Không tìm thấy khách hàng');
        const dueDate = localDate(dto.dueDate);
        if (dueDate && Number.isNaN(dueDate.getTime())) throw new BadRequestException('Ngày hẹn trả không hợp lệ');
        if (dueDate && dueDate < vietnamTodayBounds().start) throw new BadRequestException('Ngày hẹn trả phải là hôm nay hoặc ngày sau đó');
        const sequence = await tx.order.create({ data: { code: `PENDING-${crypto.randomUUID()}`, customerId: customer?.id, customerUnknown: dto.customerUnknown, note: dto.note, dueDate, duePeriod: dto.duePeriod, deliveryAddress: dto.deliveryAddress, receivedServices, createdById: userId } });
        const code = `ZU-${String(sequence.sequence).padStart(4, '0')}`;
        const saved = await tx.order.update({ where: { id: sequence.id }, data: { code } });
        await this.printing.enqueue(tx, saved.id, { code, createdAt: saved.createdAt.toISOString(), customerName: customer?.name ?? undefined, phone: customer?.phone, note: saved.note ?? undefined, dueDate: saved.dueDate?.toISOString(), duePeriod: saved.duePeriod ?? undefined, deliveryAddress: saved.deliveryAddress ?? undefined, services: receivedServices.map((service) => service.serviceName) });
        await tx.auditLog.create({ data: { userId, action: 'ORDER_CREATED', entityType: 'ORDER', entityId: saved.id, after: { code, status: saved.status, customerId: saved.customerId, customerUnknown: saved.customerUnknown, dueDate: saved.dueDate?.toISOString(), duePeriod: saved.duePeriod, deliveryAddress: saved.deliveryAddress, receivedServices } } });
        return tx.order.findUniqueOrThrow({ where: { id: saved.id }, include: details });
      });
    } catch (error) {
      this.logger.error(`order_create_failed user=${userId} error=${error instanceof Error ? error.message : 'unknown'}`);
      throw error;
    }
  }

  list(query: ListOrdersDto) {
    const search = query.search?.trim();
    return this.prisma.order.findMany({
      where: {
        status: query.status,
        OR: search ? [
          { code: { contains: search, mode: 'insensitive' } },
          { customer: { phone: { contains: search } } },
          { customer: { name: { contains: search, mode: 'insensitive' } } }
        ] : undefined
      },
      include: details,
      orderBy: { createdAt: 'desc' },
      take: 100
    });
  }

  async page(query: ListOrdersPageDto) {
    const search = query.search?.trim();
    const where: Prisma.OrderWhereInput = {
      status: query.status,
      createdAt: query.from || query.to ? {
        gte: query.from ? new Date(`${query.from}T00:00:00+07:00`) : undefined,
        lte: query.to ? new Date(`${query.to}T23:59:59.999+07:00`) : undefined,
      } : undefined,
      OR: search ? [
        { code: { contains: search, mode: 'insensitive' } },
        { customer: { phone: { contains: search } } },
        { customer: { name: { contains: search, mode: 'insensitive' } } }
      ] : undefined,
    };
    const [items, total] = await Promise.all([
      this.prisma.order.findMany({ where, include: details, orderBy: { createdAt: 'desc' }, skip: (query.page - 1) * query.limit, take: query.limit }),
      this.prisma.order.count({ where }),
    ]);
    return { items, total, page: query.page, limit: query.limit };
  }

  async get(idOrCode: string) {
    const order = await this.prisma.order.findFirst({ where: { OR: [{ id: idOrCode }, { code: idOrCode.toUpperCase() }] }, include: details });
    if (!order) throw new NotFoundException('Không tìm thấy đơn');
    return { ...order, pointsToEarn: order.total ? calculatePoints(order.total, await this.settings.loyaltyVndPerPoint()) : 0 };
  }

  async complete(idOrCode: string, dto: CompleteOrderDto, userId: string, role: Role = Role.MANAGER) {
    const current = await this.get(idOrCode);
    if (current.status !== OrderStatus.PROCESSING && current.status !== OrderStatus.READY_FOR_PICKUP) throw new BadRequestException('Chỉ đơn đang xử lý hoặc chờ trả mới có thể cập nhật');
    if (current.payments.length) throw new BadRequestException('Đơn đã thanh toán, không thể sửa');
    if (!dto.items.length) throw new BadRequestException('Đơn phải có ít nhất một dịch vụ để hoàn thành');
    if (dto.discount !== undefined && role === Role.STAFF && !new Prisma.Decimal(dto.discount).equals(current.discount)) {
      throw new BadRequestException('Nhân viên không thể thay đổi giảm giá đơn');
    }

    const order = await this.prisma.$transaction(async (tx) => {
      const latest = await tx.order.findUniqueOrThrow({ where: { id: current.id }, include: { items: true, payments: true } });
      if ((latest.status !== OrderStatus.PROCESSING && latest.status !== OrderStatus.READY_FOR_PICKUP) || latest.payments.length) {
        throw new BadRequestException('Đơn đã thay đổi, không thể cập nhật');
      }
      const expectedUpdatedAt = dto.expectedUpdatedAt ? new Date(dto.expectedUpdatedAt) : current.updatedAt;
      if (Number.isNaN(expectedUpdatedAt.getTime()) || latest.updatedAt.getTime() !== expectedUpdatedAt.getTime()) {
        throw new BadRequestException('Đơn đã được cập nhật ở thiết bị khác. Vui lòng tải lại.');
      }

      const serviceIds = [...new Set(dto.items.map((item) => item.serviceId))];
      const services = await tx.service.findMany({ where: { id: { in: serviceIds } } });
      const serviceById = new Map(services.map((service) => [service.id, service]));
      const existingById = new Map(latest.items.map((item) => [item.id, item]));
      const seenIds = new Set<string>();
      const prepared = dto.items.map((input) => {
        if (input.id && (seenIds.has(input.id) || !existingById.has(input.id))) throw new BadRequestException('Dòng dịch vụ không hợp lệ');
        if (input.id) seenIds.add(input.id);
        const existing = input.id ? existingById.get(input.id) : undefined;
        const service = serviceById.get(input.serviceId);
        const sameService = existing?.serviceId === input.serviceId;
        if (!service || (!service.active && !sameService)) throw new BadRequestException('Dịch vụ không còn hoạt động');
        const unit = sameService ? existing!.unit : service.unit;
        const quantity = new Prisma.Decimal(input.quantity);
        if ((unit === ServiceUnit.ITEM || unit === ServiceUnit.PAIR) && !quantity.isInteger()) {
          throw new BadRequestException('Dịch vụ theo món/đôi phải có số lượng nguyên');
        }
        const baseUnitPrice = sameService ? existing!.baseUnitPrice : service.price;
        const unitPrice = input.unitPrice === undefined ? (sameService ? existing!.unitPrice : service.price) : new Prisma.Decimal(input.unitPrice);
        const lineTotal = calculateLineTotal(quantity, unitPrice);
        return {
          input,
          existing,
          service,
          sameService,
          unit,
          quantity,
          baseUnitPrice,
          unitPrice,
          lineTotal,
          serviceName: sameService ? existing!.serviceName : service.name,
          priceAdjustmentReason: input.priceAdjustmentReason ?? null,
        };
      });
      const subtotal = prepared.reduce((sum, item) => sum.plus(item.lineTotal), new Prisma.Decimal(0));
      const discount = dto.discount === undefined ? latest.discount : new Prisma.Decimal(dto.discount);
      if (discount.isNegative()) throw new BadRequestException('Giảm giá không hợp lệ');
      if (discount.greaterThan(subtotal)) throw new BadRequestException('Giảm giá vượt thành tiền');
      const total = subtotal.minus(discount);
      const weight = prepared.filter((item) => item.unit === ServiceUnit.KG).reduce((sum, item) => sum.plus(item.quantity), new Prisma.Decimal(0));
      const claimed = await tx.order.updateMany({
        where: { id: latest.id, updatedAt: latest.updatedAt, status: { in: [OrderStatus.PROCESSING, OrderStatus.READY_FOR_PICKUP] }, payments: { none: {} } },
        data: { weight, subtotal, discount, total, readyAt: latest.readyAt ?? new Date(), status: OrderStatus.READY_FOR_PICKUP },
      });
      if (!claimed.count) throw new BadRequestException('Đơn đã được cập nhật ở thiết bị khác. Vui lòng tải lại.');

      const keepIds = prepared.flatMap((item) => item.input.id ? [item.input.id] : []);
      await tx.orderItem.deleteMany({ where: { orderId: latest.id, id: { notIn: keepIds } } });
      for (const item of prepared) {
        const data = { serviceId: item.service.id, serviceName: item.serviceName, unit: item.unit, quantity: item.quantity, baseUnitPrice: item.baseUnitPrice, unitPrice: item.unitPrice, lineTotal: item.lineTotal, priceAdjustmentReason: item.priceAdjustmentReason };
        if (item.existing) await tx.orderItem.update({ where: { id: item.existing.id }, data });
        else await tx.orderItem.create({ data: { orderId: latest.id, ...data } });
      }
      const saved = await tx.order.findUniqueOrThrow({ where: { id: latest.id }, include: details });
      const snapshot = (item: typeof prepared[number]) => ({ id: item.input.id, serviceId: item.service.id, serviceName: item.serviceName, unit: item.unit, quantity: item.quantity.toString(), baseUnitPrice: item.baseUnitPrice.toString(), unitPrice: item.unitPrice.toString(), lineTotal: item.lineTotal.toString(), priceAdjustmentReason: item.priceAdjustmentReason });
      const beforeItems = latest.items.map((item) => ({ id: item.id, serviceId: item.serviceId, serviceName: item.serviceName, unit: item.unit, quantity: item.quantity.toString(), baseUnitPrice: item.baseUnitPrice.toString(), unitPrice: item.unitPrice.toString(), lineTotal: item.lineTotal.toString(), priceAdjustmentReason: item.priceAdjustmentReason }));
      await tx.auditLog.create({ data: { userId, action: latest.status === OrderStatus.PROCESSING ? 'ORDER_COMPLETED' : 'ORDER_ADJUSTED', entityType: 'ORDER', entityId: saved.id, before: { status: latest.status, discount: latest.discount.toString(), items: beforeItems }, after: { status: saved.status, discount: discount.toString(), subtotal: subtotal.toString(), total: total.toString(), weight: weight.toString(), items: prepared.map(snapshot) } } });
      return saved;
    });
    if (current.status === OrderStatus.PROCESSING) void this.notifications.orderReady(order.id);
    return order;
  }

  async attachCustomer(idOrCode: string, dto: AttachCustomerDto, userId: string) {
    const current = await this.get(idOrCode);
    if (current.status !== OrderStatus.PROCESSING && current.status !== OrderStatus.READY_FOR_PICKUP) throw new BadRequestException('Không thể gắn khách vào đơn đã kết thúc');
    const customer = await this.prisma.customer.upsert({ where: { phone: normalizePhone(dto.phone) }, update: {}, create: { phone: normalizePhone(dto.phone), name: dto.name, nameNormalized: dto.name ? normalizeName(dto.name) : undefined } });
    return this.prisma.$transaction(async (tx) => {
      const order = await tx.order.update({ where: { id: current.id }, data: { customerId: customer.id, customerUnknown: false }, include: details });
      await tx.auditLog.create({ data: { userId, action: 'ORDER_CUSTOMER_ATTACHED', entityType: 'ORDER', entityId: order.id, before: { customerId: current.customerId }, after: { customerId: customer.id } } });
      return order;
    });
  }

  async returnOrder(idOrCode: string, dto: ReturnOrderDto, userId: string) {
    const current = await this.get(idOrCode);
    if (current.status !== OrderStatus.READY_FOR_PICKUP || !current.total) throw new BadRequestException('Đơn chưa sẵn sàng để trả');
    if (!current.customerId) throw new BadRequestException('Vui lòng gắn khách trước khi trả đồ');
    if (current.payments.length) throw new BadRequestException('Đơn đã thanh toán');
    const points = calculatePoints(current.total, await this.settings.loyaltyVndPerPoint());
    return this.prisma.$transaction(async (tx) => {
      const claimed = await tx.order.updateMany({ where: { id: current.id, status: OrderStatus.READY_FOR_PICKUP }, data: { status: OrderStatus.COMPLETED, completedAt: new Date(), returnedById: userId } });
      if (!claimed.count) throw new BadRequestException('Đơn đã được trả');
      const shift = await tx.shift.findFirst({ where: { closedAt: null }, select: { id: true } });
      await tx.payment.create({ data: { orderId: current.id, amount: current.total!, method: dto.method, createdById: userId, shiftId: shift?.id } });
      if (points) await tx.loyaltyTransaction.create({ data: { customerId: current.customerId!, orderId: current.id, points, type: 'ORDER' } });
      await tx.customer.update({ where: { id: current.customerId! }, data: { totalPoints: { increment: points }, totalOrders: { increment: 1 }, totalKg: { increment: current.weight ?? 0 }, totalSpent: { increment: current.total! }, firstOrderAt: current.customer?.firstOrderAt ?? new Date(), lastOrderAt: new Date() } });
      const order = await tx.order.findUniqueOrThrow({ where: { id: current.id }, include: details });
      await tx.auditLog.create({ data: { userId, action: 'ORDER_RETURNED', entityType: 'ORDER', entityId: order.id, before: { status: current.status }, after: { status: order.status, paymentMethod: dto.method, points } } });
      return order;
    });
  }

  async cancel(idOrCode: string, reason: string, userId: string) {
    const current = await this.get(idOrCode);
    if (current.status !== OrderStatus.PROCESSING && current.status !== OrderStatus.READY_FOR_PICKUP || current.payments.length) throw new BadRequestException('Chỉ có thể huỷ đơn chưa thanh toán');
    return this.prisma.$transaction(async (tx) => {
      const claimed = await tx.order.updateMany({ where: { id: current.id, status: { in: [OrderStatus.PROCESSING, OrderStatus.READY_FOR_PICKUP] }, payments: { none: {} } }, data: { status: OrderStatus.CANCELLED, cancelledAt: new Date() } });
      if (!claimed.count) throw new BadRequestException('Đơn đã thay đổi và không thể huỷ');
      const order = await tx.order.findUniqueOrThrow({ where: { id: current.id }, include: details });
      await tx.auditLog.create({ data: { userId, action: 'ORDER_CANCELLED', entityType: 'ORDER', entityId: order.id, before: { status: current.status }, after: { status: order.status, reason } } });
      return order;
    });
  }

  async reprint(idOrCode: string, userId: string) {
    const order = await this.get(idOrCode);
    const receivedServices = Array.isArray(order.receivedServices) ? order.receivedServices as Array<{ serviceName?: string }> : [];
    const job = await this.prisma.$transaction(async (tx) => {
      const queued = await this.printing.enqueue(tx, order.id, { code: order.code, createdAt: order.createdAt.toISOString(), customerName: order.customer?.name ?? undefined, phone: order.customer?.phone, note: order.note ?? undefined, dueDate: order.dueDate?.toISOString(), duePeriod: order.duePeriod ?? undefined, deliveryAddress: order.deliveryAddress ?? undefined, services: receivedServices.flatMap((service) => service.serviceName ? [service.serviceName] : []) });
      await tx.auditLog.create({ data: { userId, action: 'ORDER_REPRINTED', entityType: 'ORDER', entityId: order.id, after: { code: order.code, printJobId: queued.id } } });
      return queued;
    });
    return { ok: true, printJobId: job.id };
  }

  async summary() {
    const [processing, ready, unknown, notificationErrors] = await Promise.all([
      this.prisma.order.count({ where: { status: OrderStatus.PROCESSING } }),
      this.prisma.order.count({ where: { status: OrderStatus.READY_FOR_PICKUP } }),
      this.prisma.order.count({ where: { customerUnknown: true, status: { in: [OrderStatus.PROCESSING, OrderStatus.READY_FOR_PICKUP] } } }),
      this.prisma.notification.count({ where: { status: 'ERROR' } })
    ]);
    return { processing, ready, attention: unknown + notificationErrors };
  }
}
