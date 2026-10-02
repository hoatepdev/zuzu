import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { OrderStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PrintingService } from '../printing/printing.service';
import { SettingsService } from '../settings/settings.service';
import { AttachCustomerDto, CompleteOrderDto, CreateOrderDto, ListOrdersDto, ListOrdersPageDto, ReturnOrderDto } from './orders.dto';
import { calculateLineTotal, calculatePoints } from './money';

const details = { customer: true, createdBy: { select: { id: true, name: true } }, returnedBy: { select: { id: true, name: true } }, items: true, payments: true, notifications: { orderBy: { createdAt: 'desc' as const } }, printJobs: { select: { id: true, status: true, attempts: true, lastError: true, createdAt: true, printedAt: true, failedAt: true }, orderBy: { createdAt: 'desc' as const } } };
const normalizePhone = (phone: string) => phone.replace(/\s/g, '');

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(private readonly prisma: PrismaService, private readonly printing: PrintingService, private readonly notifications: NotificationsService, private readonly settings: SettingsService) {}

  async create(dto: CreateOrderDto, userId: string) {
    if (!dto.customerUnknown && !dto.phone) throw new BadRequestException('Vui lòng nhập số điện thoại');
    try {
      return await this.prisma.$transaction(async (tx) => {
        const customer = dto.customerUnknown ? null : await tx.customer.upsert({
          where: { phone: normalizePhone(dto.phone!) },
          update: {},
          create: { phone: normalizePhone(dto.phone!), name: dto.customerName }
        });
        const sequence = await tx.order.create({ data: { code: `PENDING-${crypto.randomUUID()}`, customerId: customer?.id, customerUnknown: dto.customerUnknown, note: dto.note, createdById: userId } });
        const code = `ZU-${String(sequence.sequence).padStart(4, '0')}`;
        const saved = await tx.order.update({ where: { id: sequence.id }, data: { code } });
        await this.printing.enqueue(tx, saved.id, { code, createdAt: saved.createdAt.toISOString(), customerName: customer?.name ?? undefined, phone: customer?.phone, note: saved.note ?? undefined });
        await tx.auditLog.create({ data: { userId, action: 'ORDER_CREATED', entityType: 'ORDER', entityId: saved.id, after: { code, status: saved.status, customerId: saved.customerId, customerUnknown: saved.customerUnknown } } });
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

  async complete(idOrCode: string, dto: CompleteOrderDto, userId: string) {
    const current = await this.get(idOrCode);
    if (current.status !== OrderStatus.PROCESSING && current.status !== OrderStatus.READY_FOR_PICKUP) throw new BadRequestException('Chỉ đơn đang xử lý hoặc chờ trả mới có thể cập nhật');
    if (current.payments.length) throw new BadRequestException('Đơn đã thanh toán, không thể sửa');
    const service = await this.prisma.service.findUnique({ where: { id: dto.serviceId } });
    if (!service?.active) throw new BadRequestException('Dịch vụ không còn hoạt động');
    const quantity = new Prisma.Decimal(dto.quantity);
    const subtotal = calculateLineTotal(quantity, service.price);
    const discount = new Prisma.Decimal(dto.discount ?? 0);
    if (discount.greaterThan(subtotal)) throw new BadRequestException('Giảm giá vượt thành tiền');
    const total = subtotal.minus(discount);
    const order = await this.prisma.$transaction(async (tx) => {
      const claimed = await tx.order.updateMany({ where: { id: current.id, status: { in: [OrderStatus.PROCESSING, OrderStatus.READY_FOR_PICKUP] }, payments: { none: {} } }, data: { weight: service.unit === 'KG' ? quantity : null, subtotal, discount, total, readyAt: current.readyAt ?? new Date(), status: OrderStatus.READY_FOR_PICKUP } });
      if (!claimed.count) throw new BadRequestException('Đơn đã thay đổi, không thể cập nhật');
      await tx.orderItem.deleteMany({ where: { orderId: current.id } });
      await tx.orderItem.create({ data: { orderId: current.id, serviceId: service.id, serviceName: service.name, unit: service.unit, quantity, unitPrice: service.price, lineTotal: subtotal } });
      const saved = await tx.order.findUniqueOrThrow({ where: { id: current.id }, include: details });
      const adjusting = current.status === OrderStatus.READY_FOR_PICKUP;
      await tx.auditLog.create({ data: { userId, action: adjusting ? 'ORDER_ADJUSTED' : 'ORDER_COMPLETED', entityType: 'ORDER', entityId: saved.id, before: adjusting ? { total: current.total?.toString(), discount: current.discount.toString() } : { status: current.status }, after: { status: saved.status, quantity: quantity.toString(), subtotal: subtotal.toString(), discount: discount.toString(), total: total.toString(), serviceId: service.id } } });
      return saved;
    });
    if (current.total === null || !current.total.equals(total)) void this.notifications.orderReady(order.id);
    return order;
  }

  async attachCustomer(idOrCode: string, dto: AttachCustomerDto, userId: string) {
    const current = await this.get(idOrCode);
    if (current.status !== OrderStatus.PROCESSING && current.status !== OrderStatus.READY_FOR_PICKUP) throw new BadRequestException('Không thể gắn khách vào đơn đã kết thúc');
    const customer = await this.prisma.customer.upsert({ where: { phone: normalizePhone(dto.phone) }, update: {}, create: { phone: normalizePhone(dto.phone), name: dto.name } });
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
    const job = await this.prisma.$transaction(async (tx) => {
      const queued = await this.printing.enqueue(tx, order.id, { code: order.code, createdAt: order.createdAt.toISOString(), customerName: order.customer?.name ?? undefined, phone: order.customer?.phone, note: order.note ?? undefined });
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
