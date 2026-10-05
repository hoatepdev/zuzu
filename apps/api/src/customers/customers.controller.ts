import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { Role } from "@prisma/client";
import { AuthGuard } from "../auth/auth.guard";
import { RolesGuard } from "../auth/roles.guard";
import { CurrentUser, Roles, SessionUser } from "../common/auth.types";
import {
  ListCustomersDto,
  LoyaltyAdjustDto,
  UpdateCustomerDto,
} from "./customers.dto";
import { CustomersService } from "./customers.service";
@Controller("customers")
@UseGuards(AuthGuard, RolesGuard)
export class CustomersController {
  constructor(private readonly customers: CustomersService) {}
  @Get("search") search(@Query("q") q = "") {
    return q.trim() ? this.customers.search(q) : [];
  }
  @Get() list(@Query() query: ListCustomersDto) {
    return this.customers.list(query);
  }
  @Get(":id") get(@Param("id") id: string) {
    return this.customers.get(id);
  }
  @Patch(":id") update(
    @Param("id") id: string,
    @Body() dto: UpdateCustomerDto,
    @CurrentUser() user: SessionUser,
  ) {
    return this.customers.update(id, dto, user.id);
  }
  @Post(":id/loyalty-adjust") @Roles(Role.MANAGER, Role.OWNER) loyaltyAdjust(
    @Param("id") id: string,
    @Body() dto: LoyaltyAdjustDto,
    @CurrentUser() user: SessionUser,
  ) {
    return this.customers.loyaltyAdjust(id, dto.points, dto.reason, user.id);
  }
}
