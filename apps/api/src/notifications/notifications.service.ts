import { Inject, Injectable, Logger } from '@nestjs/common';
import { NotificationStatus } from '@prisma/client';
import { PrismaService } from '../prisma.service';

export interface NotificationProvider { send(phone: string, message: string): Promise<void>; }
export const NOTIFICATION_PROVIDER = Symbol('NOTIFICATION_PROVIDER');

@Injectable()
export class MockNotificationProvider implements NotificationProvider {
  private readonly logger = new Logger(MockNotificationProvider.name);
  async send(phone: string, message: string) { this.logger.log(JSON.stringify({ channel: 'ZALO_MOCK', phone, message })); }
}

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService, @Inject(NOTIFICATION_PROVIDER) private readonly provider: NotificationProvider) {}

  async orderReady(orderId: string) {
    const order = await this.prisma.order.findUniqueOrThrow({ where: { id: orderId }, include: { customer: true } });
    const message = `ZUZU xin chào\n\nĐơn ${order.code} của anh/chị đã hoàn thành và có thể đến nhận.\n\nTổng tiền: ${order.total?.toString()}đ\n\nCảm ơn anh/chị đã sử dụng ZUZU.`;
    if (!order.customer) {
      await this.prisma.notification.create({ data: { orderId, channel: 'ZALO_MOCK', status: NotificationStatus.SKIPPED, message, error: 'Chưa xác định khách' } });
      return;
    }
    try {
      await this.provider.send(order.customer.phone, message);
      await this.prisma.notification.create({ data: { orderId, channel: 'ZALO_MOCK', status: NotificationStatus.SENT, message } });
    } catch (error) {
      await this.prisma.notification.create({ data: { orderId, channel: 'ZALO_MOCK', status: NotificationStatus.ERROR, message, error: error instanceof Error ? error.message : 'Gửi thất bại' } });
    }
  }
}
