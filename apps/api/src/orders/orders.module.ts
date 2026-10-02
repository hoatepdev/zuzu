import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { PrintingModule } from '../printing/printing.module';
import { SettingsModule } from '../settings/settings.module';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';

@Module({ imports: [AuthModule, PrintingModule, NotificationsModule, SettingsModule], controllers: [OrdersController], providers: [OrdersService] })
export class OrdersModule {}
