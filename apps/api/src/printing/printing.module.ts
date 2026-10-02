import { Module } from '@nestjs/common';
import { PrintAgentGuard } from './print-agent.guard';
import { PrintingController } from './printing.controller';
import { PrintingService } from './printing.service';

@Module({
  controllers: [PrintingController],
  providers: [PrintingService, PrintAgentGuard],
  exports: [PrintingService]
})
export class PrintingModule {}
