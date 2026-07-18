import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client';
import { UserRole } from '../generated/prisma/enums';

const telegramId = process.argv[2];
const connectionString = process.env.DATABASE_URL;

if (!telegramId || !/^\d+$/.test(telegramId)) {
  throw new Error('Foydalanish: npm run admin:promote -- TELEGRAM_ID');
}
if (!connectionString) throw new Error('DATABASE_URL topilmadi');

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

async function promote() {
  const user = await prisma.user.update({
    where: { telegramId: BigInt(telegramId) },
    data: { role: UserRole.ADMIN },
    select: { id: true, telegramId: true, username: true, role: true },
  });
  console.log(`Admin tayinlandi: ${user.username ?? user.telegramId.toString()}`);
}

void promote().finally(() => prisma.$disconnect());
