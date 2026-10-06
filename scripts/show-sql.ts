import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { env } from '../src/config/env';

const adapter = new PrismaPg({ connectionString: env.databaseUrl });

const prisma = new PrismaClient({
  adapter,
  log: [{ emit: 'event', level: 'query' }],
});

prisma.$on('query', (e) => {
  console.log('  SQL    :', e.query);
  console.log('  params :', e.params);
  console.log('  tempo  :', e.duration + 'ms');
  console.log('');
});

async function main(): Promise<void> {
  console.log('=== findUnique por email (o login) ===');
  await prisma.user.findUnique({ where: { email: 'ana@teste.com' } });

  console.log('=== findUnique por id (o /auth/me) ===');
  await prisma.user.findUnique({ where: { id: '00000000-0000-7000-8000-000000000000' } });


  await prisma.$disconnect();
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
