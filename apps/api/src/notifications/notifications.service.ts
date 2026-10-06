import { Inject, Injectable, Logger } from '@nestjs/common';
import { NotificationStatus } from '@prisma/client';
import { PrismaService } from '../prisma.service';

export interface NotificationProvider { send(phone: string, message: string): Promise<void>; }
export const NOTIFICATION_PROVIDER = Symbol('NOTIFICATION_PROVIDER');

@Injectable()
export class MockNotificationProvider implements NotificationProvider {
  private readonly logger = new Logger(MockNotificationProvider.name);
  async send(phone: string, message: string) { this.logger.log(JSON.stringify({ channel: 'ZALO', phone: `${phone.slice(0, 3)}***${phone.slice(-3)}`, message })); }
}

@Injectable()
export class NotificationsService {
  private readonly orderReadyLocks = new Map<string, Promise<void>>();

  constructor(private readonly prisma: PrismaService, @Inject(NOTIFICATION_PROVIDER) private readonly provider: NotificationProvider) {}

  async orderReady(orderId: string) {
    const previous = this.orderReadyLocks.get(orderId) ?? Promise.resolve();
    const current = previous.then(() => this.sendOrderReady(orderId));
    this.orderReadyLocks.set(orderId, current);
    try {
      await current;
    } finally {
      if (this.orderReadyLocks.get(orderId) === current) this.orderReadyLocks.delete(orderId);
    }
  }

  private async sendOrderReady(orderId: string) {
    const order = await this.prisma.order.findUniqueOrThrow({ where: { id: orderId }, include: { customer: true } });
    const message = `ZUZU xin chào 👋\n\nĐơn ${order.code} của anh/chị đã giặt xong và sẵn sàng để nhận.\n\nTổng tiền: ${Number(order.total ?? 0).toLocaleString('vi-VN')}đ\n\nCảm ơn anh/chị đã sử dụng Giặt là ZUZU 💙`;
    if (await this.prisma.notification.findFirst({ where: { orderId, type: 'ORDER_READY', channel: 'ZALO', status: NotificationStatus.SENT } })) return;
    if (!order.customer) {
      await this.prisma.notification.create({ data: { orderId, type: 'ORDER_READY', channel: 'ZALO', status: NotificationStatus.SKIPPED, message, error: 'Chưa xác định khách' } });
      return;
    }
    try {
      await this.provider.send(order.customer.phone, message);
      await this.prisma.notification.create({ data: { orderId, type: 'ORDER_READY', channel: 'ZALO', status: NotificationStatus.SENT, message } });
    } catch (error) {
      await this.prisma.notification.create({ data: { orderId, type: 'ORDER_READY', channel: 'ZALO', status: NotificationStatus.ERROR, message, error: error instanceof Error ? error.message : 'Gửi thất bại' } });
    }
  }
}
