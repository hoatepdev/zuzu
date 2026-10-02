import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma.service';
import { ListCustomersDto, UpdateCustomerDto } from './customers.dto';

@Injectable()
export class CustomersService {
  constructor(private readonly prisma: PrismaService) {}
  private where(q?: string): Prisma.CustomerWhereInput | undefined { const value = q?.trim(); if (!value) return undefined; return { OR: [{ phone: { contains: value.replace(/\s/g, '') } }, { name: { contains: value, mode: 'insensitive' } }] }; }
  search(q: string) { return this.prisma.customer.findMany({ where: this.where(q), orderBy: [{ lastOrderAt: { sort: 'desc', nulls: 'last' } }, { createdAt: 'desc' }], take: 10 }); }
  async list(query: ListCustomersDto) { const where = this.where(query.q); const [items, total] = await Promise.all([this.prisma.customer.findMany({ where, orderBy: [{ lastOrderAt: { sort: 'desc', nulls: 'last' } }, { createdAt: 'desc' }], skip: (query.page - 1) * query.limit, take: query.limit }), this.prisma.customer.count({ where })]); return { items, total, page: query.page, limit: query.limit }; }
  async get(id: string) { const customer = await this.prisma.customer.findUnique({ where: { id }, include: { orders: { include: { items: true, payments: true }, orderBy: { createdAt: 'desc' } }, loyalty: { orderBy: { createdAt: 'desc' } } } }); if (!customer) throw new NotFoundException('Không tìm thấy khách'); return customer; }
  async update(id: string, dto: UpdateCustomerDto, userId: string) { const current = await this.prisma.customer.findUnique({ where: { id } }); if (!current) throw new NotFoundException('Không tìm thấy khách'); return this.prisma.$transaction(async (tx) => { const customer = await tx.customer.update({ where: { id }, data: dto }); await tx.auditLog.create({ data: { userId, action: 'CUSTOMER_UPDATED', entityType: 'CUSTOMER', entityId: id, before: { name: current.name, note: current.note, laundryPreference: current.laundryPreference, marketingOptIn: current.marketingOptIn }, after: { name: customer.name, note: customer.note, laundryPreference: customer.laundryPreference, marketingOptIn: customer.marketingOptIn } } }); return customer; }); }
  async loyaltyAdjust(id: string, points: number, reason: string, userId: string) { const current = await this.prisma.customer.findUnique({ where: { id } }); if (!current) throw new NotFoundException('Không tìm thấy khách'); return this.prisma.$transaction(async (tx) => { await tx.loyaltyTransaction.create({ data: { customerId: id, points, type: 'ADJUSTMENT' } }); const customer = await tx.customer.update({ where: { id }, data: { totalPoints: { increment: points } } }); await tx.auditLog.create({ data: { userId, action: 'LOYALTY_ADJUSTED', entityType: 'CUSTOMER', entityId: id, before: { totalPoints: current.totalPoints }, after: { totalPoints: customer.totalPoints, points, reason } } }); return customer; }); }
}
