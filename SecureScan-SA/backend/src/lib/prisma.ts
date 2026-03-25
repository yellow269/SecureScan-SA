import { PrismaClient } from '@prisma/client';

// In dev, Next/Node hot reload can create multiple clients.
// This pattern keeps a single instance per process.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error']
  });

if (!globalForPrisma.prisma) globalForPrisma.prisma = prisma;

