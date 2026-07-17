import { PrismaClient } from '@prisma/client';

/**
 * Singleton Prisma client. In dev, reuse across HMR reloads to avoid exhausting
 * connections. Query logging is enabled only outside production.
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma: PrismaClient =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'production' ? ['error'] : ['error', 'warn'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
