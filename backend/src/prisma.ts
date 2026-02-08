import { PrismaClient } from "@prisma/client";

declare global {
  var __PRISMA__: PrismaClient | undefined;
}

export const prisma =
  globalThis.__PRISMA__ ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"]
  });

if (process.env.NODE_ENV !== "production") globalThis.__PRISMA__ = prisma;


