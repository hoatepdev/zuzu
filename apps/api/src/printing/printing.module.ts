import { Module } from '@nestjs/common';
import { MockPrintProvider, PRINT_PROVIDER, PrintingService } from './printing.service';
import { HttpPrintProvider } from './http-print.provider';

// PRINT_PROVIDER=mock (default) | http — shop machines set PRINT_PROVIDER=http
const provider = process.env.PRINT_PROVIDER === 'http' ? HttpPrintProvider : MockPrintProvider;

@Module({
  providers: [PrintingService, { provide: PRINT_PROVIDER, useClass: provider }],
  exports: [PrintingService]
})
export class PrintingModule {}
