import { PaymentMethod } from '@prisma/client';
import { IsBoolean, IsDateString, IsEnum, IsIn, IsInt, IsOptional, IsString, IsUrl, Max, Min, MinLength } from 'class-validator';
import { Transform, Type } from 'class-transformer';

export const EXPENSE_CATEGORIES = ['Sửa chữa', 'Nước giặt / nước xả', 'Hóa chất', 'Túi / bao bì', 'Giấy bill', 'Điện', 'Nước', 'Tiền nhà', 'Lương', 'Ship', 'Marketing', 'Đồ dùng cửa hàng', 'Khác'] as const;

export class CreateExpenseDto {
  @Type(() => Number) @IsInt() @Min(1) amount!: number;
  @IsIn(EXPENSE_CATEGORIES) category!: string;
  @IsString() @MinLength(1) description!: string;
  @IsDateString() expenseDate!: string;
  @IsEnum(PaymentMethod) paymentMethod!: PaymentMethod;
  @IsOptional() @IsUrl() receiptUrl?: string;
}
export class UpdateExpenseDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) amount?: number;
  @IsOptional() @IsIn(EXPENSE_CATEGORIES) category?: string;
  @IsOptional() @IsString() @MinLength(1) description?: string;
  @IsOptional() @IsDateString() expenseDate?: string;
  @IsOptional() @IsEnum(PaymentMethod) paymentMethod?: PaymentMethod;
  @IsOptional() @IsUrl() receiptUrl?: string;
}
export class VoidExpenseDto { @IsString() @MinLength(3) reason!: string; }
export class ListExpensesDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit = 20;
  @IsOptional() @IsDateString() from?: string;
  @IsOptional() @IsDateString() to?: string;
  @IsOptional() @IsString() category?: string;
  @IsOptional() @IsEnum(PaymentMethod) paymentMethod?: PaymentMethod;
  @IsOptional() @Transform(({ value }) => value === true || value === 'true') @IsBoolean() includeVoided = false;
}
