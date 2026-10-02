import { IsBoolean, IsOptional, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @IsString() usernameOrPhone!: string;
  @IsString() @MinLength(6) password!: string;
  @IsOptional() @IsBoolean() remember?: boolean;
}
