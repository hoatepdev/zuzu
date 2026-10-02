import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { AuthGuard } from '../auth/auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { CurrentUser, Roles, SessionUser } from '../common/auth.types';
import { CloseShiftDto, ListShiftsDto } from './shifts.dto';
import { ShiftsService } from './shifts.service';

@Controller('shifts') @UseGuards(AuthGuard, RolesGuard) @Roles(Role.MANAGER, Role.OWNER)
export class ShiftsController {
  constructor(private readonly shifts: ShiftsService) {}
  @Get() list(@Query() query: ListShiftsDto) { return this.shifts.list(query.page, query.limit); }
  @Get('current') current() { return this.shifts.current(); }
  @Post('open') open(@CurrentUser() user: SessionUser) { return this.shifts.open(user.id); }
  @Post(':id/close') close(@Param('id') id: string, @Body() dto: CloseShiftDto, @CurrentUser() user: SessionUser) { return this.shifts.close(id, dto.actualCash, user.id); }
}
