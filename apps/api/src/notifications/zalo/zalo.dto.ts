import { IsPhoneNumber } from 'class-validator';

export class TestZaloDto {
  @IsPhoneNumber('VN')
  phone!: string;
}
