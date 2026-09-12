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
    await prisma.staffAccount.upsert({
      where: { username: account.username },
      update: {
        role: account.role,
        displayName: account.displayName,
        isActive: true,
      },
      create: {
        username: account.username,
        passwordHash: hashedPassword,
        role: account.role,
        displayName: account.displayName,
        isActive: true,
        isOnline: false,
      },
    });

    console.log(`  ✅ Seeded/Updated staff account: ${account.username} (${account.role})`);
  }

  console.log('\n✅ Database seeding completed successfully!');
  console.log('📋 Login Credentials:');
  console.log('   Username: admin');
  console.log('   Password: admin123\n');
}

async function main() {
  try {
    await seedDatabase();
  } catch (error) {
    console.error('❌ Seeding error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
    console.log('👋 Database connection closed');
  }
}

main();
