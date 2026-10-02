import { Inject, Injectable, Logger } from '@nestjs/common';

export type Bill = { code: string; createdAt: Date; customerName?: string; phone?: string; note?: string };
export interface PrintProvider { print(bill: Bill): Promise<void>; }
export const PRINT_PROVIDER = Symbol('PRINT_PROVIDER');

@Injectable()
export class MockPrintProvider implements PrintProvider {
  private readonly logger = new Logger(MockPrintProvider.name);
  async print(bill: Bill) {
    this.logger.log(JSON.stringify({ printer: 'K80_MOCK', qr: bill.code, ...bill }));
  }
}

@Injectable()
export class PrintingService {
  constructor(@Inject(PRINT_PROVIDER) private readonly provider: PrintProvider) {}
  print(bill: Bill) { return this.provider.print(bill); }
}
