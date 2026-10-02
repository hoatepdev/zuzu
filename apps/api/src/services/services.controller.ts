import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { AuthGuard } from '../auth/auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { CurrentUser, Roles, SessionUser } from '../common/auth.types';
import { CreateServiceDto, UpdateServiceDto } from './services.dto';
import { ServicesService } from './services.service';
@Controller('services') @UseGuards(AuthGuard, RolesGuard)
export class ServicesController {
  constructor(private readonly services: ServicesService) {}
  @Get() list() { return this.services.active(); }
  @Get('all') @Roles(Role.MANAGER, Role.OWNER) all() { return this.services.all(); }
  @Post() @Roles(Role.MANAGER, Role.OWNER) create(@Body() dto: CreateServiceDto, @CurrentUser() user: SessionUser) { return this.services.create(dto, user.id); }
  @Patch(':id') @Roles(Role.MANAGER, Role.OWNER) update(@Param('id') id: string, @Body() dto: UpdateServiceDto, @CurrentUser() user: SessionUser) { return this.services.update(id, dto, user.id); }
}
