import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "@/generated/prisma/client";
import { resolveDatabaseUrl } from "@/lib/db-connection";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

const adapter = new PrismaMariaDb(resolveDatabaseUrl());

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
