import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsPhoneNumber } from 'class-validator';

export class TestZaloDto {
  @ApiProperty() @IsPhoneNumber('VN')
  phone!: string;
}
