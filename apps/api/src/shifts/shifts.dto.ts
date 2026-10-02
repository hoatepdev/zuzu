import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';
export class CloseShiftDto { @Type(() => Number) @IsInt() @Min(0) actualCash!: number; }
export class ListShiftsDto { @IsOptional() @Type(() => Number) @IsInt() @Min(1) page = 1; @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit = 20; }
