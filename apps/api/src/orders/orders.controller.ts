import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { AuthGuard } from '../auth/auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { CurrentUser, Roles, SessionUser } from '../common/auth.types';
import { AttachCustomerDto, CancelOrderDto, CompleteOrderDto, CreateOrderDto, ListOrdersDto, ListOrdersPageDto, ReturnOrderDto } from './orders.dto';
import { OrdersService } from './orders.service';

@Controller('orders') @UseGuards(AuthGuard, RolesGuard)
export class OrdersController {
  constructor(private readonly orders: OrdersService) {}
  @Post() create(@Body() dto: CreateOrderDto, @CurrentUser() user: SessionUser) { return this.orders.create(dto, user.id); }
  @Get('summary') summary() { return this.orders.summary(); }
  @Get('page') page(@Query() query: ListOrdersPageDto) { return this.orders.page(query); }
  @Get() list(@Query() query: ListOrdersDto) { return this.orders.list(query); }
  @Get(':id') get(@Param('id') id: string) { return this.orders.get(id); }
  @Post(':id/complete') complete(@Param('id') id: string, @Body() dto: CompleteOrderDto, @CurrentUser() user: SessionUser) { return this.orders.complete(id, dto, user.id, user.role); }
  @Post(':id/attach-customer') attach(@Param('id') id: string, @Body() dto: AttachCustomerDto, @CurrentUser() user: SessionUser) { return this.orders.attachCustomer(id, dto, user.id); }
  @Post(':id/return') returnOrder(@Param('id') id: string, @Body() dto: ReturnOrderDto, @CurrentUser() user: SessionUser) { return this.orders.returnOrder(id, dto, user.id); }
  @Post(':id/reprint') reprint(@Param('id') id: string, @CurrentUser() user: SessionUser) { return this.orders.reprint(id, user.id); }
  @Post(':id/cancel') @Roles(Role.MANAGER, Role.OWNER) cancel(@Param('id') id: string, @Body() dto: CancelOrderDto, @CurrentUser() user: SessionUser) { return this.orders.cancel(id, dto.reason, user.id); }
}
