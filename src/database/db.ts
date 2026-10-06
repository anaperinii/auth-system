import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { env } from '../config/env';

const adapter = new PrismaPg({
  connectionString: env.databaseUrl,
  max: env.poolMax,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 10_000,
});

export const prisma = new PrismaClient({
  adapter,
  log: ['warn', 'error'],
});

export async function assertDatabaseConnection(): Promise<void> {
  await prisma.$queryRaw`SELECT 1`;
}

export async function closeDatabase(): Promise<void> {
  await prisma.$disconnect();
}
