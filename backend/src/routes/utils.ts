import type { FastifyReply, FastifyRequest } from "fastify";
import { prisma } from "../prisma.js";
import type { UserRole } from "@prisma/client";
import { nameFromClaims, roleFromClaims, verifySupabaseToken } from "../supabaseAuth.js";
import { hasCustomerAccess, hasTechnicianAccess, isAdmin } from "../rbac.js";

export async function requireAuth(req: FastifyRequest) {
  const auth = req.headers.authorization ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) throw new Error("Unauthorized");

  const claims = await verifySupabaseToken(token);
  const userId = claims.sub;
  if (!userId) throw new Error("Unauthorized");

  const role = roleFromClaims(claims);
  const name = nameFromClaims(claims) ?? claims.email ?? claims.phone ?? "User";
  const email = claims.email ?? null;
  const phone = claims.phone ?? null;

  const user = await prisma.user.upsert({
    where: { id: userId },
    create: {
      id: userId,
      role,
      name,
      email,
      phone,
      customerProfile: role === "technician" ? undefined : { create: {} },
      technicianProfile: role === "customer" ? undefined : { create: { trades: [] } }
    },
    update: {
      role,
      name,
      email,
      phone
    }
  });

  if (role === "customer" || role === "both") {
    await prisma.customerProfile.upsert({
      where: { userId: user.id },
      create: { userId: user.id },
      update: {}
    });
  }
  if (role === "technician" || role === "both") {
    await prisma.technicianProfile.upsert({
      where: { userId: user.id },
      create: { userId: user.id, trades: [] },
      update: {}
    });
  }

  if (user.isDeactivated) throw new Error("Account deactivated");
  req.user = user;
  return user;
}

export function ok<T>(data: T) {
  return { ok: true, data } as const;
}

export function fail(message: string, code = 400) {
  return { ok: false, error: { message, code } } as const;
}

export function assertRole(role: UserRole, kind: "customer" | "technician" | "admin") {
  if (kind === "customer" && !hasCustomerAccess(role)) throw new Error("Forbidden");
  if (kind === "technician" && !hasTechnicianAccess(role)) throw new Error("Forbidden");
  if (kind === "admin" && !isAdmin(role)) throw new Error("Forbidden");
}

export async function withErrorHandling(
  _req: FastifyRequest,
  reply: FastifyReply,
  fn: () => Promise<unknown>
) {
  try {
    const data = await fn();
    return reply.send(ok(data));
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    const status = message === "Forbidden" ? 403 : message === "Unauthorized" ? 401 : 400;
    return reply.status(status).send(fail(message, status));
  }
}


