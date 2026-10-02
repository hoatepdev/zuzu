import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Role } from '@prisma/client';
import { PrismaClient } from '@prisma/client';
import { hashPassword, verifyPassword } from '../src/password';
import { PrismaService } from '../src/prisma.service';
import { SettingsService } from '../src/settings/settings.service';
import { ShiftsService } from '../src/shifts/shifts.service';
import { AuthGuard } from '../src/auth/auth.guard';
import { UsersService } from '../src/users/users.service';

const prisma = new PrismaClient();
const db = prisma as unknown as PrismaService;
const users = new UsersService(db);
const settings = new SettingsService(db);
const shifts = new ShiftsService(db);
const suffix = Date.now().toString();
let ownerId: string;
let staffId: string;
let shiftId: string;

beforeAll(async () => {
  ownerId = (await prisma.user.create({ data: { username: `own-${suffix}`, name: 'Owner Test', role: Role.OWNER, passwordHash: await hashPassword('zuzu123') } })).id;
  staffId = (await prisma.user.create({ data: { username: `stf-${suffix}`, name: 'Staff Test', role: Role.STAFF, passwordHash: await hashPassword('zuzu123') } })).id;
});
afterAll(async () => {
  await settings.updateLoyalty(10000, ownerId);
  if (shiftId) await prisma.shift.deleteMany({ where: { id: shiftId } });
  await prisma.auditLog.deleteMany({ where: { OR: [{ userId: ownerId }, { userId: staffId }] } });
  await prisma.user.deleteMany({ where: { id: { in: [ownerId, staffId] } } });
  await prisma.$disconnect();
});

it('manages users without leaking hashes or locking the store out', async () => {
  const created = await users.create({ username: `new-${suffix}`, name: 'Mới', role: Role.STAFF, password: 'matkhau1' }, ownerId);
  expect(created).not.toHaveProperty('passwordHash');
  await expect(users.create({ username: `new-${suffix}`, name: 'Trùng', role: Role.STAFF, password: 'matkhau1' }, ownerId)).rejects.toThrow('đã tồn tại');
  await expect(users.create({ username: `own2-${suffix}`, name: 'X', role: Role.OWNER, password: 'matkhau1' }, ownerId)).rejects.toThrow('Không tạo Owner');
  await expect(users.update(ownerId, { active: false }, ownerId)).rejects.toThrow('tự khoá');
  await expect(users.update(ownerId, { role: Role.MANAGER }, ownerId)).rejects.toThrow('tự khoá hoặc hạ quyền');
  const renamed = await users.update(created.id, { name: 'Mới hơn' }, ownerId);
  expect(renamed.name).toBe('Mới hơn');
  await users.resetPassword(created.id, 'matkhau22', ownerId);
  const stored = await prisma.user.findUniqueOrThrow({ where: { id: created.id } });
  expect(await verifyPassword('matkhau22', stored.passwordHash)).toBe(true);
  expect(await prisma.auditLog.count({ where: { userId: ownerId, entityType: 'USER', entityId: created.id } })).toBe(3);
  await prisma.user.delete({ where: { id: created.id } });
});

it('refreshes role and blocks inactive sessions on every request', async () => {
  const jwt = new JwtService({ secret: process.env.JWT_SECRET ?? 'development-only-change-me' });
  const guard = new AuthGuard(jwt, db);
  const run = () => {
    const request = { cookies: { zuzu_session: jwt.sign({ id: staffId, username: 'x', name: 'x', role: Role.MANAGER }) }, user: undefined };
    return guard.canActivate({ switchToHttp: () => ({ getRequest: () => request }) } as unknown as ExecutionContext);
  };
  await expect(run()).resolves.toBe(true);
  await prisma.user.update({ where: { id: staffId }, data: { role: Role.MANAGER } });
  await expect(run()).resolves.toBe(true);
  await prisma.user.update({ where: { id: staffId }, data: { active: false } });
  await expect(run()).rejects.toThrow('Tài khoản đã bị vô hiệu hoá');
  await expect(new AuthGuard(jwt, db).canActivate({ switchToHttp: () => ({ getRequest: () => ({ cookies: {} }) }) } as unknown as ExecutionContext)).rejects.toThrow('Vui lòng đăng nhập');
  await prisma.user.update({ where: { id: staffId }, data: { active: true, role: Role.STAFF } });
});

it('updates loyalty setting with audit and lists closed shift snapshots', async () => {
  await settings.updateLoyalty(5000, ownerId);
  expect(await settings.loyalty()).toEqual({ vndPerPoint: 5000 });
  expect(await prisma.auditLog.count({ where: { userId: ownerId, action: 'SETTING_UPDATED' } })).toBeGreaterThanOrEqual(1);
  const shift = await shifts.open(ownerId); shiftId = shift.id;
  await shifts.close(shift.id, 0, ownerId);
  const history = await shifts.list(1, 20);
  const row = history.items.find((item) => item.id === shiftId);
  expect(row?.systemCash?.toString()).toBe('0');
  expect(row?.closedBy?.id).toBe(ownerId);
});
