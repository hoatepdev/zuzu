import { PaymentMethod, OrderStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsDateString, IsEnum, IsInt, IsNotEmpty, IsNumber, IsOptional, IsPhoneNumber, IsString, Max, Min, MinLength, ValidateNested } from 'class-validator';

export class CreateOrderDto {
  @IsOptional() @IsPhoneNumber('VN') phone?: string;
  @IsOptional() @IsString() customerName?: string;
  @IsOptional() @IsString() note?: string;
  @IsBoolean() customerUnknown!: boolean;
}
export class CompleteOrderItemDto {
  @IsOptional() @IsString() id?: string;
  @IsString() @IsNotEmpty() serviceId!: string;
  @Type(() => Number) @IsNumber({ maxDecimalPlaces: 2 }) @Min(0.01) quantity!: number;
  @IsOptional() @Type(() => Number) @IsNumber({ maxDecimalPlaces: 0 }) @Min(0) unitPrice?: number;
  @IsOptional() @IsString() priceAdjustmentReason?: string | null;
}

export class CompleteOrderDto {
  @IsArray() @ValidateNested({ each: true }) @Type(() => CompleteOrderItemDto) items!: CompleteOrderItemDto[];
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) discount?: number;
  @IsOptional() @IsDateString() expectedUpdatedAt?: string;
}
export class AttachCustomerDto {
  @IsPhoneNumber('VN') phone!: string;
  @IsOptional() @IsString() name?: string;
}
export class ReturnOrderDto { @IsEnum(PaymentMethod) method!: PaymentMethod; }
export class CancelOrderDto { @IsString() @MinLength(3) reason!: string; }
export class ListOrdersDto {
  @IsOptional() @IsString() search?: string;
  @IsOptional() @IsEnum(OrderStatus) status?: OrderStatus;
}
export class ListOrdersPageDto extends ListOrdersDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit = 20;
  @IsOptional() @IsDateString() from?: string;
  @IsOptional() @IsDateString() to?: string;
}
