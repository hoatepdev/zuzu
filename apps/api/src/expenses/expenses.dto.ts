import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentMethod } from '@prisma/client';
import { IsBoolean, IsDateString, IsEnum, IsIn, IsInt, IsOptional, IsString, IsUrl, Max, Min, MinLength } from 'class-validator';
import { Transform, Type } from 'class-transformer';

export const EXPENSE_CATEGORIES = ['Sửa chữa', 'Nước giặt / nước xả', 'Hóa chất', 'Túi / bao bì', 'Giấy bill', 'Điện', 'Nước', 'Tiền nhà', 'Lương', 'Ship', 'Marketing', 'Đồ dùng cửa hàng', 'Khác'] as const;

export class CreateExpenseDto {
  @ApiProperty() @Type(() => Number) @IsInt() @Min(1) amount!: number;
  @ApiProperty() @IsIn(EXPENSE_CATEGORIES) category!: string;
  @ApiProperty() @IsString() @MinLength(1) description!: string;
  @ApiProperty() @IsDateString() expenseDate!: string;
  @ApiProperty() @IsEnum(PaymentMethod) paymentMethod!: PaymentMethod;
  @ApiPropertyOptional() @IsOptional() @IsUrl() receiptUrl?: string;
}
export class UpdateExpenseDto {
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(1) amount?: number;
  @ApiPropertyOptional() @IsOptional() @IsIn(EXPENSE_CATEGORIES) category?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MinLength(1) description?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() expenseDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsEnum(PaymentMethod) paymentMethod?: PaymentMethod;
  @ApiPropertyOptional() @IsOptional() @IsUrl() receiptUrl?: string;
}
export class VoidExpenseDto { @IsString() @MinLength(3) reason!: string; }
export class ListExpensesDto {
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(1) page = 1;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit = 20;
  @ApiPropertyOptional() @IsOptional() @IsDateString() from?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() to?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() category?: string;
  @ApiPropertyOptional() @IsOptional() @IsEnum(PaymentMethod) paymentMethod?: PaymentMethod;
  @ApiPropertyOptional() @IsOptional() @Transform(({ value }) => value === true || value === 'true') @IsBoolean() includeVoided = false;
}
