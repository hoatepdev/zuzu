import { Type } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, IsString, Max, Min, MinLength, NotEquals } from 'class-validator';
export class ListCustomersDto { @IsOptional() @IsString() q?: string; @IsOptional() @Type(() => Number) @IsInt() @Min(1) page = 1; @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit = 20; }
export class UpdateCustomerDto { @IsOptional() @IsString() name?: string; @IsOptional() @IsString() address?: string; @IsOptional() @IsString() note?: string; @IsOptional() @IsString() laundryPreference?: string; @IsOptional() @IsBoolean() marketingOptIn?: boolean; }
export class LoyaltyAdjustDto { @Type(() => Number) @IsInt() @NotEquals(0) points!: number; @IsString() @MinLength(3) reason!: string; }
