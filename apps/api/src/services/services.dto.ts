import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ServiceUnit } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsBoolean, IsEnum, IsInt, IsOptional, IsString, Min, MinLength } from 'class-validator';
export class CreateServiceDto { @IsString() @MinLength(1) name!: string; @IsOptional() @Type(() => Number) @IsInt() @Min(1) stt?: number; @IsOptional() @IsBoolean() isDefault?: boolean; @IsEnum(ServiceUnit) unit!: ServiceUnit; @Type(() => Number) @IsInt() @Min(1) price!: number; }
export class UpdateServiceDto { @IsOptional() @IsString() @MinLength(1) name?: string; @IsOptional() @Type(() => Number) @IsInt() @Min(1) stt?: number; @IsOptional() @IsBoolean() isDefault?: boolean; @IsOptional() @IsEnum(ServiceUnit) unit?: ServiceUnit; @IsOptional() @Type(() => Number) @IsInt() @Min(1) price?: number; @IsOptional() @IsBoolean() active?: boolean; }
