import type { FastifyReply, FastifyRequest } from "fastify";
import { prisma } from "../prisma.js";
import type { UserRole } from "@prisma/client";
import { getAuthedUserId } from "../auth.js";
import { hasCustomerAccess, hasTechnicianAccess, isAdmin } from "../rbac.js";

export async function requireAuth(req: FastifyRequest) {
  const userId = await getAuthedUserId(req);
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error("Unauthorized");
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


