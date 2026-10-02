import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { AuthGuard } from '../auth/auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { CurrentUser, Roles, SessionUser } from '../common/auth.types';
import { CreateExpenseDto, ListExpensesDto, UpdateExpenseDto, VoidExpenseDto } from './expenses.dto';
import { ExpensesService } from './expenses.service';

@Controller('expenses') @UseGuards(AuthGuard, RolesGuard)
export class ExpensesController {
  constructor(private readonly expenses: ExpensesService) {}
  @Post() @Roles(Role.STAFF, Role.MANAGER, Role.OWNER) create(@Body() dto: CreateExpenseDto, @CurrentUser() user: SessionUser) { return this.expenses.create(dto, user.id); }
  @Get() @Roles(Role.MANAGER, Role.OWNER) list(@Query() query: ListExpensesDto) { return this.expenses.list(query); }
  @Patch(':id') @Roles(Role.MANAGER, Role.OWNER) update(@Param('id') id: string, @Body() dto: UpdateExpenseDto, @CurrentUser() user: SessionUser) { return this.expenses.update(id, dto, user.id); }
  @Post(':id/void') @Roles(Role.MANAGER, Role.OWNER) void(@Param('id') id: string, @Body() dto: VoidExpenseDto, @CurrentUser() user: SessionUser) { return this.expenses.void(id, dto.reason, user.id); }
}
