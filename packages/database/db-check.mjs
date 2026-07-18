import { PrismaClient } from '@prisma/client';

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL تنظیم نشده است.');
  process.exit(1);
}

const masked = url.replace(/:\/\/([^:]+):([^@]*)@/, '://$1:***@');
console.log('رشته‌ای که تست می‌شود:');
console.log('  ' + masked);
console.log('');

const prisma = new PrismaClient();
try {
  const users = await prisma.user.count();
  const accounts = await prisma.instagramAccount.count({ where: { deletedAt: null } });
  console.log('OK - اتصال موفق بود.');
  console.log(`   کاربران: ${users}  |  پیج‌های فعال: ${accounts}`);
} catch (err) {
  console.error('FAILED - اتصال ناموفق بود.');
  console.error('   ' + err.message.split('\n').filter(Boolean).slice(0, 3).join('\n   '));
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
