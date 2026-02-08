import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../prisma.js";
import { withErrorHandling, requireAuth } from "./utils.js";

const PatchMeSchema = z.object({
  name: z.string().min(1).optional(),
  photo: z.string().url().optional()
});

const SetRoleSchema = z.object({
  role: z.enum(["customer", "technician", "both"])
});

export async function meRoutes(app: FastifyInstance) {
  app.get("/", async (req, reply) =>
    withErrorHandling(req, reply, async () => {
      const user = await requireAuth(req);
      const [customerProfile, technicianProfile] = await Promise.all([
        prisma.customerProfile.findUnique({
          where: { userId: user.id },
          include: { savedAddresses: true, paymentMethods: true }
        }),
        prisma.technicianProfile.findUnique({ where: { userId: user.id } })
      ]);
      return {
        user,
        customerProfile,
        technicianProfile
      };
    })
  );

  app.patch("/", async (req, reply) =>
    withErrorHandling(req, reply, async () => {
      const user = await requireAuth(req);
      const body = PatchMeSchema.parse(req.body);
      const updated = await prisma.user.update({
        where: { id: user.id },
        data: body
      });
      return { user: updated };
    })
  );

  app.post("/role", async (req, reply) =>
    withErrorHandling(req, reply, async () => {
      const user = await requireAuth(req);
      const body = SetRoleSchema.parse(req.body);

      const updated = await prisma.user.update({
        where: { id: user.id },
        data: { role: body.role }
      });

      if (body.role === "customer" || body.role === "both") {
        await prisma.customerProfile.upsert({
          where: { userId: user.id },
          create: { userId: user.id },
          update: {}
        });
      }
      if (body.role === "technician" || body.role === "both") {
        await prisma.technicianProfile.upsert({
          where: { userId: user.id },
          create: { userId: user.id, trades: [] },
          update: {}
        });
      }

      return { user: updated };
    })
  );
}


