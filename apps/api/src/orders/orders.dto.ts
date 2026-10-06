import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DuePeriod, PaymentMethod, OrderStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import { ArrayUnique, IsArray, IsBoolean, IsDateString, IsEnum, IsInt, IsNotEmpty, IsNumber, IsOptional, IsPhoneNumber, IsString, Max, MaxLength, Min, MinLength, ValidateNested } from 'class-validator';

export class CreateOrderDto {
  @ApiPropertyOptional() @IsOptional() @IsPhoneNumber('VN') phone?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(200) customerName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(500) customerAddress?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(500) note?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() dueDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsEnum(DuePeriod) duePeriod?: DuePeriod;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(500) deliveryAddress?: string;
  @ApiPropertyOptional() @IsOptional() @IsArray() @ArrayUnique() @IsString({ each: true }) serviceIds?: string[];
  @ApiPropertyOptional() @IsOptional() @IsString() customerId?: string;
  @ApiProperty() @IsBoolean() customerUnknown!: boolean;
}
export class CompleteOrderItemDto {
  @ApiPropertyOptional() @IsOptional() @IsString() id?: string;
  @ApiProperty() @IsString() @IsNotEmpty() serviceId!: string;
  @ApiProperty() @Type(() => Number) @IsNumber({ maxDecimalPlaces: 1 }) @Min(0.1) quantity!: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsNumber({ maxDecimalPlaces: 0 }) @Min(0) unitPrice?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() priceAdjustmentReason?: string | null;
}

export class CompleteOrderDto {
  @ApiProperty() @IsArray() @ValidateNested({ each: true }) @Type(() => CompleteOrderItemDto) items!: CompleteOrderItemDto[];
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(0) discount?: number;
  @ApiPropertyOptional() @IsOptional() @IsDateString() expectedUpdatedAt?: string;
}
export class AttachCustomerDto {
  @ApiProperty() @IsPhoneNumber('VN') phone!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() name?: string;
}
export class ReturnOrderDto { @IsEnum(PaymentMethod) method!: PaymentMethod; }
export class CancelOrderDto { @IsString() @MinLength(3) reason!: string; }
export class ListOrdersDto {
  @ApiPropertyOptional() @IsOptional() @IsString() search?: string;
  @ApiPropertyOptional() @IsOptional() @IsEnum(OrderStatus) status?: OrderStatus;
}
export class ListOrdersPageDto extends ListOrdersDto {
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(1) page = 1;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit = 20;
  @ApiPropertyOptional() @IsOptional() @IsDateString() from?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() to?: string;
}
