import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { AuthGuard } from '../auth/auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../common/auth.types';
import { DashboardRangeDto } from './dashboard.dto';
import { DashboardService } from './dashboard.service';
@Controller('dashboard') @UseGuards(AuthGuard, RolesGuard) @Roles(Role.MANAGER, Role.OWNER)
export class DashboardController { constructor(private readonly dashboard: DashboardService) {} @Get('today') today() { return this.dashboard.today(); } @Get('range') range(@Query() dto: DashboardRangeDto) { return this.dashboard.range(dto.from, dto.to); } }
