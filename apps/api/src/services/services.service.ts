import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma.service';
import { CreateServiceDto, UpdateServiceDto } from './services.dto';
@Injectable()
export class ServicesService {
  constructor(private readonly prisma: PrismaService) {}
  active() { return this.prisma.service.findMany({ where: { active: true }, orderBy: { name: 'asc' } }); }
  all() { return this.prisma.service.findMany({ orderBy: { name: 'asc' } }); }
  async create(dto: CreateServiceDto, userId: string) {
    try { return await this.prisma.$transaction(async (tx) => { const service = await tx.service.create({ data: dto }); await tx.auditLog.create({ data: { userId, action: 'SERVICE_CREATED', entityType: 'SERVICE', entityId: service.id, after: { name: service.name, unit: service.unit, price: service.price.toString(), active: service.active } } }); return service; }); }
    catch (error) { if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') throw new BadRequestException('Tên dịch vụ đã tồn tại'); throw error; }
  }
  async update(id: string, dto: UpdateServiceDto, userId: string) {
    const current = await this.prisma.service.findUnique({ where: { id } }); if (!current) throw new NotFoundException('Không tìm thấy dịch vụ');
    try { return await this.prisma.$transaction(async (tx) => { const service = await tx.service.update({ where: { id }, data: dto }); await tx.auditLog.create({ data: { userId, action: 'SERVICE_UPDATED', entityType: 'SERVICE', entityId: id, before: { name: current.name, unit: current.unit, price: current.price.toString(), active: current.active }, after: { name: service.name, unit: service.unit, price: service.price.toString(), active: service.active } } }); return service; }); }
    catch (error) { if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') throw new BadRequestException('Tên dịch vụ đã tồn tại'); throw error; }
  }
}
