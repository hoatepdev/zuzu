import { Module } from '@nestjs/common';
import { AuditModule } from './audit/audit.module';
import { AuthModule } from './auth/auth.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { ExpensesModule } from './expenses/expenses.module';
import { CustomersModule } from './customers/customers.module';
import { NotificationsModule } from './notifications/notifications.module';
import { OrdersModule } from './orders/orders.module';
import { PrismaModule } from './prisma.module';
import { ServicesModule } from './services/services.module';
import { SettingsModule } from './settings/settings.module';
import { ShiftsModule } from './shifts/shifts.module';
import { UsersModule } from './users/users.module';

@Module({ imports: [PrismaModule, AuthModule, OrdersModule, NotificationsModule, ServicesModule, CustomersModule, ExpensesModule, ShiftsModule, DashboardModule, AuditModule, UsersModule, SettingsModule] })
export class AppModule {}
