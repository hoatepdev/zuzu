import { Module } from '@nestjs/common';
import { MockPrintProvider, PRINT_PROVIDER, PrintingService } from './printing.service';

@Module({
  providers: [PrintingService, { provide: PRINT_PROVIDER, useClass: MockPrintProvider }],
  exports: [PrintingService]
})
export class PrintingModule {}
