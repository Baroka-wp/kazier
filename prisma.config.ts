import type { Prisma } from "@prisma/client";

export default {
  datasourceUrl: process.env.DATABASE_URL,
} satisfies Prisma.PrismaClientOptions;
