import { Injectable } from '@nestjs/common';
import { Bill, PrintProvider } from './printing.service';

@Injectable()
export class HttpPrintProvider implements PrintProvider {
  private readonly url = process.env.PRINT_AGENT_URL ?? 'http://127.0.0.1:3210';
  private readonly timeoutMs = Number(process.env.PRINT_AGENT_TIMEOUT_MS ?? 3000);

  async print(bill: Bill) {
    let response: Response;
    try {
      response = await fetch(`${this.url}/print`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(bill),
        signal: AbortSignal.timeout(this.timeoutMs)
      });
    } catch (error) {
      if (error instanceof Error && error.name === 'TimeoutError') throw new Error('Máy in không phản hồi');
      throw new Error('Không kết nối được ZUZU Print Agent');
    }
    if (!response.ok) {
      const message = await response.json().then((body: { message?: string }) => body?.message).catch(() => undefined);
      throw new Error(message ?? 'Không thể in bill');
    }
  }
}
