import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class PrintJobClaimDto {
  @ApiProperty() @IsString() @MinLength(1) @MaxLength(100) claimToken!: string;
}

export class PrintJobFailureDto extends PrintJobClaimDto {
  @ApiProperty() @IsString() @MinLength(1) @MaxLength(500) error!: string;
}
