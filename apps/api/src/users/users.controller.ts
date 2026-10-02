import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { AuthGuard } from '../auth/auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { CurrentUser, Roles, SessionUser } from '../common/auth.types';
import { CreateUserDto, ResetPasswordDto, UpdateUserDto } from './users.dto';
import { UsersService } from './users.service';
@Controller('users') @UseGuards(AuthGuard, RolesGuard) @Roles(Role.OWNER)
export class UsersController { constructor(private readonly users: UsersService) {} @Get() list() { return this.users.list(); } @Post() create(@Body() dto: CreateUserDto, @CurrentUser() actor: SessionUser) { return this.users.create(dto, actor.id); } @Patch(':id') update(@Param('id') id: string, @Body() dto: UpdateUserDto, @CurrentUser() actor: SessionUser) { return this.users.update(id, dto, actor.id); } @Post(':id/reset-password') reset(@Param('id') id: string, @Body() dto: ResetPasswordDto, @CurrentUser() actor: SessionUser) { return this.users.resetPassword(id, dto.password, actor.id); } }
