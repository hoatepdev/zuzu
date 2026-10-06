import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { PrintAgentGuard } from './print-agent.guard';
import { SkipThrottle } from '@nestjs/throttler';
import { PrintJobClaimDto, PrintJobFailureDto } from './printing.dto';
import { PrintingService } from './printing.service';

@Controller('print-jobs')
@SkipThrottle()
@UseGuards(PrintAgentGuard)
export class PrintingController {
  constructor(private readonly printing: PrintingService) {}

  @Get('next')
  next() { return this.printing.claimNext(); }

  @Post(':id/success')
  success(@Param('id') id: string, @Body() dto: PrintJobClaimDto) { return this.printing.succeed(id, dto.claimToken); }

  @Post(':id/failure')
  failure(@Param('id') id: string, @Body() dto: PrintJobFailureDto) { return this.printing.fail(id, dto.claimToken, dto.error); }
}
