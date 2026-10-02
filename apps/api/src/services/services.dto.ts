import { ServiceUnit } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsBoolean, IsEnum, IsInt, IsOptional, IsString, Min, MinLength } from 'class-validator';
export class CreateServiceDto { @IsString() @MinLength(1) name!: string; @IsEnum(ServiceUnit) unit!: ServiceUnit; @Type(() => Number) @IsInt() @Min(1) price!: number; }
export class UpdateServiceDto { @IsOptional() @IsString() @MinLength(1) name?: string; @IsOptional() @IsEnum(ServiceUnit) unit?: ServiceUnit; @IsOptional() @Type(() => Number) @IsInt() @Min(1) price?: number; @IsOptional() @IsBoolean() active?: boolean; }
