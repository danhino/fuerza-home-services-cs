import type { UserRole } from "@prisma/client";

export function hasCustomerAccess(role: UserRole) {
  return role === "customer" || role === "both" || role === "admin";
}

export function hasTechnicianAccess(role: UserRole) {
  return role === "technician" || role === "both" || role === "admin";
}

export function isAdmin(role: UserRole) {
  return role === "admin";
}


