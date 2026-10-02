import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';
import { hashPassword } from '../password';
import { PrismaService } from '../prisma.service';
import { CreateUserDto, UpdateUserDto } from './users.dto';
const select = { id: true, username: true, phone: true, name: true, role: true, active: true, createdAt: true };
@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}
  list() { return this.prisma.user.findMany({ select, orderBy: [{ active: 'desc' }, { name: 'asc' }] }); }
  async create(dto: CreateUserDto, actorId: string) {
    if (dto.role === Role.OWNER) throw new BadRequestException('Không tạo Owner qua giao diện');
    try { return await this.prisma.$transaction(async tx => { const { password, ...userData } = dto; const user = await tx.user.create({ data: { ...userData, passwordHash: await hashPassword(password) }, select }); await tx.auditLog.create({ data: { userId: actorId, action: 'USER_CREATED', entityType: 'USER', entityId: user.id, after: { username: user.username, phone: user.phone, name: user.name, role: user.role, active: user.active } } }); return user; }); }
    catch (error) { if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') throw new BadRequestException('Tên đăng nhập hoặc SĐT đã tồn tại'); throw error; }
  }
  async update(id: string, dto: UpdateUserDto, actorId: string) {
    const current = await this.prisma.user.findUnique({ where: { id } }); if (!current) throw new NotFoundException('Không tìm thấy nhân viên');
    if (id === actorId && (dto.active === false || dto.role && dto.role !== Role.OWNER)) throw new BadRequestException('Không thể tự khoá hoặc hạ quyền tài khoản');
    if (current.role === Role.OWNER && current.active && (dto.active === false || dto.role && dto.role !== Role.OWNER) && await this.prisma.user.count({ where: { role: Role.OWNER, active: true } }) <= 1) throw new BadRequestException('Phải còn ít nhất một Owner hoạt động');
    try { return await this.prisma.$transaction(async tx => { const user = await tx.user.update({ where: { id }, data: dto, select }); await tx.auditLog.create({ data: { userId: actorId, action: 'USER_UPDATED', entityType: 'USER', entityId: id, before: { username: current.username, phone: current.phone, name: current.name, role: current.role, active: current.active }, after: { username: user.username, phone: user.phone, name: user.name, role: user.role, active: user.active } } }); return user; }); }
    catch (error) { if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') throw new BadRequestException('Tên đăng nhập hoặc SĐT đã tồn tại'); throw error; }
  }
  async resetPassword(id: string, password: string, actorId: string) { const current = await this.prisma.user.findUnique({ where: { id }, select: { id: true } }); if (!current) throw new NotFoundException('Không tìm thấy nhân viên'); return this.prisma.$transaction(async tx => { await tx.user.update({ where: { id }, data: { passwordHash: await hashPassword(password) } }); await tx.auditLog.create({ data: { userId: actorId, action: 'USER_PASSWORD_RESET', entityType: 'USER', entityId: id, after: { reset: true } } }); return { ok: true }; }); }
}
