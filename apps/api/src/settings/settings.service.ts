import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
const KEY = 'LOYALTY_VND_PER_POINT';
@Injectable()
export class SettingsService {
  constructor(private readonly prisma: PrismaService) {}
  async loyaltyVndPerPoint() { const setting = await this.prisma.storeSetting.findUnique({ where: { key: KEY } }); const value = Number(setting?.value ?? 10000); return Number.isInteger(value) && value > 0 ? value : 10000; }
  async loyalty() { return { vndPerPoint: await this.loyaltyVndPerPoint() }; }
  async updateLoyalty(vndPerPoint: number, userId: string) { return this.prisma.$transaction(async tx => { const current = await tx.storeSetting.findUnique({ where: { key: KEY } }); await tx.storeSetting.upsert({ where: { key: KEY }, update: { value: String(vndPerPoint) }, create: { key: KEY, value: String(vndPerPoint) } }); await tx.auditLog.create({ data: { userId, action: 'SETTING_UPDATED', entityType: 'STORE_SETTING', entityId: KEY, before: { value: current?.value ?? '10000' }, after: { value: String(vndPerPoint) } } }); return { vndPerPoint }; }); }
}
