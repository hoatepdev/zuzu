// Production bootstrap: creates the first Owner and required store config.
// Never creates the development demo accounts (owner/manager/staff with zuzu123).
// Usage: DATABASE_URL=<prod> BOOTSTRAP_OWNER_USERNAME=... BOOTSTRAP_OWNER_PASSWORD=... npm run db:bootstrap --workspace @zuzu/api
import { PrismaClient, Role, ServiceUnit } from '@prisma/client';
import { hashPassword } from '../src/password';

const prisma = new PrismaClient();

async function main() {
  const username = process.env.BOOTSTRAP_OWNER_USERNAME ?? 'owner';
  const password = process.env.BOOTSTRAP_OWNER_PASSWORD;
  if (!password || password.length < 8) throw new Error('BOOTSTRAP_OWNER_PASSWORD is required (min 8 chars)');

  await prisma.user.upsert({
    where: { username },
    update: {},
    create: { username, name: 'Chủ cửa hàng', role: Role.OWNER, passwordHash: await hashPassword(password) },
  });

  await prisma.service.updateMany({ where: { isDefault: true }, data: { isDefault: false } });
  for (const [stt, name, unit, price] of [
    [1, 'Giặt thường', ServiceUnit.KG, 15000], [2, 'Phân loại', ServiceUnit.KG, 17000],
    [3, 'Chăn', ServiceUnit.KG, 20000], [4, 'Giày', ServiceUnit.PAIR, 50000],
    [5, 'Topper', ServiceUnit.ITEM, 100000], [6, 'Tẩy điểm', ServiceUnit.ITEM, 30000]
  ] as const) await prisma.service.upsert({ where: { name }, update: { stt, isDefault: name === 'Giặt thường' }, create: { name, stt, unit, price, isDefault: name === 'Giặt thường' } });

  await prisma.storeSetting.upsert({ where: { key: 'LOYALTY_VND_PER_POINT' }, update: {}, create: { key: 'LOYALTY_VND_PER_POINT', value: '10000' } });
  console.log(`Bootstrapped owner "${username}" and default service catalog. Change this password after first login.`);
}

main().finally(() => prisma.$disconnect());
