import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';
import { AuthGuard } from '../auth/auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../common/auth.types';
import { PrismaService } from '../prisma.service';
import { ListAuditDto } from './audit.dto';
@Controller('audit-logs') @UseGuards(AuthGuard, RolesGuard) @Roles(Role.MANAGER, Role.OWNER)
export class AuditController {
  constructor(private readonly prisma: PrismaService) {}
  @Get() async list(@Query() query: ListAuditDto) {
    const where: Prisma.AuditLogWhereInput = { action: query.action, entityType: query.entityType, userId: query.userId, createdAt: query.from || query.to ? { gte: query.from ? new Date(query.from) : undefined, lte: query.to ? new Date(query.to) : undefined } : undefined };
    const [items, total] = await Promise.all([this.prisma.auditLog.findMany({ where, include: { user: { select: { id: true, name: true, username: true, role: true } } }, orderBy: { createdAt: 'desc' }, skip: (query.page - 1) * query.limit, take: query.limit }), this.prisma.auditLog.count({ where })]);
    return { items, total, page: query.page, limit: query.limit };
  }
}
