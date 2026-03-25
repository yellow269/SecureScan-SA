import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const plans = [
    { name: 'Starter', priceZar: 99_00, websitesLimit: 1 },
    { name: 'Business', priceZar: 299_00, websitesLimit: 10 },
    { name: 'Agency', priceZar: 999_00, websitesLimit: 50 }
  ];

  for (const p of plans) {
    await prisma.subscriptionPlan.upsert({
      where: { name: p.name },
      update: { priceZar: p.priceZar, websitesLimit: p.websitesLimit },
      create: p
    });
  }

  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (adminEmail && adminPassword) {
    const passwordHash = await bcrypt.hash(adminPassword, 12);
    await prisma.user.upsert({
      where: { email: adminEmail },
      update: { passwordHash, role: 'ADMIN' },
      create: { email: adminEmail, passwordHash, role: 'ADMIN' }
    });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async e => {
    // eslint-disable-next-line no-console
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });

