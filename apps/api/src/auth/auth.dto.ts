import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsPhoneNumber, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty() @IsString() usernameOrPhone!: string;
  @ApiProperty() @IsString() @MinLength(6) password!: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() remember?: boolean;
}
// Self-service profile: whitelist strips role/active/username nếu client cố gửi
export class UpdateProfileDto {
  @ApiProperty() @IsString() @MinLength(1) name!: string;
  // null = xoá SĐT; undefined không xảy ra vì frontend luôn gửi field
  @ApiPropertyOptional() @IsOptional() @IsPhoneNumber('VN') phone?: string | null;
}
export class ChangePasswordDto {
  @ApiProperty() @IsString() currentPassword!: string;
  @ApiProperty() @IsString() @MinLength(6) newPassword!: string;
}
