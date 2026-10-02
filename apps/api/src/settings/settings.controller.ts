import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { AuthGuard } from '../auth/auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { CurrentUser, Roles, SessionUser } from '../common/auth.types';
import { UpdateLoyaltySettingDto } from './settings.dto';
import { SettingsService } from './settings.service';
@Controller('settings') @UseGuards(AuthGuard, RolesGuard) @Roles(Role.OWNER)
export class SettingsController { constructor(private readonly settings: SettingsService) {} @Get('loyalty') loyalty() { return this.settings.loyalty(); } @Put('loyalty') update(@Body() dto: UpdateLoyaltySettingDto, @CurrentUser() user: SessionUser) { return this.settings.updateLoyalty(dto.vndPerPoint, user.id); } }
