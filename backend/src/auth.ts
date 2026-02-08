import crypto from "node:crypto";
import type { FastifyRequest } from "fastify";
import { prisma } from "./prisma.js";

export type JwtUser = {
  userId: string;
};

export function hashOtp(code: string) {
  return crypto.createHash("sha256").update(code).digest("hex");
}

export function generateOtpCode(): string {
  // 6-digit numeric
  const n = crypto.randomInt(0, 1_000_000);
  return String(n).padStart(6, "0");
}

export async function assertActiveUser(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error("User not found");
  if (user.isDeactivated) throw new Error("Account deactivated");
  return user;
}

export async function getAuthedUserId(req: FastifyRequest): Promise<string> {
  const jwt = await req.jwtVerify<JwtUser>();
  return jwt.userId;
}


