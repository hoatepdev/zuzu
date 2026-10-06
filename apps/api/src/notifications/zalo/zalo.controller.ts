import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { AuthGuard } from '../../auth/auth.guard';
import { RolesGuard } from '../../auth/roles.guard';
import { Roles } from '../../common/auth.types';
import { ZcaNotificationProvider } from './zca-notification.provider';
import { TestZaloDto } from './zalo.dto';
import { ZaloConnectionService } from './zalo-connection.service';

@Controller('notifications/zalo')
@UseGuards(AuthGuard, RolesGuard)
@Roles(Role.OWNER)
export class ZaloController {
  constructor(private readonly connection: ZaloConnectionService, private readonly provider: ZcaNotificationProvider) {}

  @Get('status') status() { return this.connection.getStatus(); }
  @Post('connect') connect() { return this.connection.startQrLogin(); }
  @Post('disconnect') disconnect() { return this.connection.disconnect(); }
  @Post('test') async test(@Body() dto: TestZaloDto) { await this.provider.send(dto.phone, 'ZUZU kiểm tra kết nối Zalo thành công ✅'); return { ok: true }; }
}
