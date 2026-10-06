import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { MockNotificationProvider, NOTIFICATION_PROVIDER, NotificationsService } from './notifications.service';
import { ZaloController } from './zalo/zalo.controller';
import { ZcaNotificationProvider } from './zalo/zca-notification.provider';
import { ZaloConnectionService } from './zalo/zalo-connection.service';

@Module({
  imports: [AuthModule],
  controllers: [ZaloController],
  providers: [
    NotificationsService,
    ZaloConnectionService,
    ZcaNotificationProvider,
    MockNotificationProvider,
    { provide: NOTIFICATION_PROVIDER, useFactory: (zca: ZcaNotificationProvider, mock: MockNotificationProvider) => process.env.ZALO_PROVIDER === 'zca' ? zca : mock, inject: [ZcaNotificationProvider, MockNotificationProvider] },
  ],
  exports: [NotificationsService, ZaloConnectionService]
})
export class NotificationsModule {}
