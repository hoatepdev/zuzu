import { IsBoolean, IsOptional, IsPhoneNumber, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @IsString() usernameOrPhone!: string;
  @IsString() @MinLength(6) password!: string;
  @IsOptional() @IsBoolean() remember?: boolean;
}
// Self-service profile: whitelist strips role/active/username nếu client cố gửi
export class UpdateProfileDto {
  @IsString() @MinLength(1) name!: string;
  // null = xoá SĐT; undefined không xảy ra vì frontend luôn gửi field
  @IsOptional() @IsPhoneNumber('VN') phone?: string | null;
}
export class ChangePasswordDto {
  @IsString() currentPassword!: string;
  @IsString() @MinLength(6) newPassword!: string;
}
