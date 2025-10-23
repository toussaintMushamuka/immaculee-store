import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ["error", "warn"],
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
    // Configuration pour améliorer la stabilité des connexions
    transactionOptions: {
      maxWait: 10000, // 10 secondes
      timeout: 30000, // 30 secondes
    },
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
