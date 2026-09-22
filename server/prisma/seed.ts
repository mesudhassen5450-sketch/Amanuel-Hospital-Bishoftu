import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const staffAccounts = [
  { username: 'admin', role: 'ADMIN', displayName: 'System Administrator' },
  { username: 'dr.amanuel', role: 'DOCTOR', displayName: 'Dr. Amanuel' },
  { username: 'receptionist', role: 'RECEPTIONIST', displayName: 'Front Desk' },
  { username: 'pharmacist', role: 'PHARMACIST', displayName: 'Pharmacy Tech' },
  { username: 'labtech', role: 'LAB_TECH', displayName: 'Lab Specialist' },
  { username: 'cashier', role: 'CASHIER', displayName: 'Billing Officer' },
];

async function seedDatabase() {
  console.log('🌱 Starting database seeding...');

  const defaultPassword = 'admin123';
  const hashedPassword = await bcrypt.hash(defaultPassword, 10);

  console.log('👥 Seeding staff_accounts table...');

  for (const account of staffAccounts) {
    // Create missing bootstrap accounts only.
    // Never overwrite passwords, never reactivate deleted/disabled accounts.
    const existing = await prisma.staffAccount.findUnique({
      where: { username: account.username },
    });

    if (existing) {
      console.log(`  ⏭️  Skipping existing staff account: ${account.username}`);
      continue;
    }

    await prisma.staffAccount.create({
      data: {
        username: account.username,
        passwordHash: hashedPassword,
        role: account.role,
        displayName: account.displayName,
        isActive: true,
        isOnline: false,
      },
    });

    console.log(`  ✅ Created staff account: ${account.username} (${account.role})`);
  }

  console.log('\n✅ Database seeding completed successfully!');
  console.log('📋 Login Credentials:');
  console.log('   Username: admin');
  console.log('   Password: admin123\n');
}

async function main() {
  try {
    await seedDatabase();
  } catch (error: any) {
    const raw = String(error?.message || error || '');
    const dbUnreachable =
      /can't reach database server/i.test(raw) ||
      /P1001|P1002|P1017/i.test(raw) ||
      /ECONNREFUSED|ETIMEDOUT|ENOTFOUND/i.test(raw);

    console.error('❌ Seeding error:', error);

    // Never fail Render/Netlify builds when Postgres is temporarily offline.
    // Accounts already exist in production; seed is best-effort bootstrap only.
    if (dbUnreachable) {
      console.warn(
        '⚠️  Database unreachable during seed — continuing build. Fix DATABASE_URL / resume Postgres in Render, then redeploy or run: npm run prisma:seed'
      );
      process.exit(0);
    }

    process.exit(1);
  } finally {
    await prisma.$disconnect().catch(() => undefined);
    console.log('👋 Database connection closed');
  }
}

main();
