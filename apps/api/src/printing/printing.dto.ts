import { IsString, MaxLength, MinLength } from 'class-validator';

export class PrintJobClaimDto {
  @IsString() @MinLength(1) @MaxLength(100) claimToken!: string;
}

export class PrintJobFailureDto extends PrintJobClaimDto {
  @IsString() @MinLength(1) @MaxLength(500) error!: string;
}
