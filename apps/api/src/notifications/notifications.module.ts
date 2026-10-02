import { Module } from '@nestjs/common';
import { MockNotificationProvider, NOTIFICATION_PROVIDER, NotificationsService } from './notifications.service';

@Module({
  providers: [NotificationsService, { provide: NOTIFICATION_PROVIDER, useClass: MockNotificationProvider }],
  exports: [NotificationsService]
})
export class NotificationsModule {}
