import { Type } from 'class-transformer';
import { IsInt, Min } from 'class-validator';
export class UpdateLoyaltySettingDto { @Type(() => Number) @IsInt() @Min(1) vndPerPoint!: number; }
