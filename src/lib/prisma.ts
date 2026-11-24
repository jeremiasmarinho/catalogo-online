import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { PrismaClient } from "@prisma/client";

const configuredDatabaseUrl = process.env.DATABASE_URL;
const workingDirectory = process.cwd();
let projectRoot = workingDirectory;
while (
  !existsSync(resolve(projectRoot, "prisma", "migrations")) &&
  resolve(projectRoot, "..") !== projectRoot
) {
  projectRoot = resolve(projectRoot, "..");
}
const databaseUrl =
  configuredDatabaseUrl?.startsWith("file:./")
    ? `file:${resolve(projectRoot, "prisma", configuredDatabaseUrl.slice("file:./".length)).replace(/\\/g, "/")}`
    : configuredDatabaseUrl;

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    ...(databaseUrl ? { datasources: { db: { url: databaseUrl } } } : {}),
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
