import { PaymentMethod, PrismaClient, Role, ServiceUnit } from '@prisma/client';
import { hashPassword } from '../src/password';

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await hashPassword('zuzu123');
  for (const user of [
    { username: 'owner', name: 'Chủ cửa hàng', role: Role.OWNER },
    { username: 'manager', name: 'Quản lý', role: Role.MANAGER },
    { username: 'staff', name: 'Nhân viên', role: Role.STAFF }
  ]) await prisma.user.upsert({ where: { username: user.username }, update: {}, create: { ...user, passwordHash } });

  await prisma.service.updateMany({ where: { isDefault: true }, data: { isDefault: false } });
  for (const [stt, name, unit, price] of [
    [1, 'Giặt thường', ServiceUnit.KG, 15000], [2, 'Phân loại', ServiceUnit.KG, 17000],
    [3, 'Chăn', ServiceUnit.KG, 20000], [4, 'Giày', ServiceUnit.PAIR, 50000],
    [5, 'Topper', ServiceUnit.ITEM, 100000], [6, 'Tẩy điểm', ServiceUnit.ITEM, 30000]
  ] as const) await prisma.service.upsert({ where: { name }, update: { stt, unit, price, isDefault: name === 'Giặt thường' }, create: { name, stt, unit, price, isDefault: name === 'Giặt thường' } });

  await prisma.storeSetting.upsert({ where: { key: 'LOYALTY_VND_PER_POINT' }, update: { value: '10000' }, create: { key: 'LOYALTY_VND_PER_POINT', value: '10000' } });
  const customer = await prisma.customer.upsert({ where: { phone: '0876000068' }, update: { nameNormalized: 'anh hoa' }, create: { phone: '0876000068', name: 'Anh Hoà', nameNormalized: 'anh hoa' } });
  const owner = await prisma.user.findUniqueOrThrow({ where: { username: 'owner' } });
  const existing = await prisma.order.findFirst({ where: { code: 'ZU-DEMO' } });
  if (!existing) await prisma.order.create({ data: { code: 'ZU-DEMO', customerId: customer.id, customerUnknown: false, note: 'Giặt riêng', createdById: owner.id } });
  console.log(`Seeded owner/staff password: zuzu123 (${PaymentMethod.CASH})`);
}
main().finally(() => prisma.$disconnect());
