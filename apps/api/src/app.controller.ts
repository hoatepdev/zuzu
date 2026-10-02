import { Controller, Get, HttpCode, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Controller()
export class AppController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('health')
  @HttpCode(200)
  async health() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { ok: true, database: 'connected' };
    } catch {
      throw new ServiceUnavailableException({ ok: false, database: 'disconnected' });
    }
  }
}
