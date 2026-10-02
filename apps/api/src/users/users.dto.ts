import { Role } from '@prisma/client';
import { IsBoolean, IsEnum, IsOptional, IsPhoneNumber, IsString, MinLength } from 'class-validator';
export class CreateUserDto { @IsString() @MinLength(1) username!: string; @IsOptional() @IsPhoneNumber('VN') phone?: string; @IsString() @MinLength(1) name!: string; @IsEnum(Role) role!: Role; @IsString() @MinLength(6) password!: string; }
export class UpdateUserDto { @IsOptional() @IsString() @MinLength(1) username?: string; @IsOptional() @IsPhoneNumber('VN') phone?: string; @IsOptional() @IsString() @MinLength(1) name?: string; @IsOptional() @IsEnum(Role) role?: Role; @IsOptional() @IsBoolean() active?: boolean; }
export class ResetPasswordDto { @IsString() @MinLength(6) password!: string; }
