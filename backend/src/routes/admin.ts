import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../prisma.js";
import { withErrorHandling, requireAuth, assertRole } from "./utils.js";

const PagingSchema = z.object({
  take: z.coerce.number().optional(),
  skip: z.coerce.number().optional()
});

const DeactivateSchema = z.object({
  isDeactivated: z.boolean()
});

export async function adminRoutes(app: FastifyInstance) {
  app.get("/users", async (req, reply) =>
    withErrorHandling(req, reply, async () => {
      const user = await requireAuth(req);
      assertRole(user.role, "admin");
      const q = PagingSchema.parse(req.query);
      const take = Math.min(q.take ?? 50, 200);
      const skip = q.skip ?? 0;
      const users = await prisma.user.findMany({
        orderBy: { createdAt: "desc" },
        take,
        skip
      });
      return { users, take, skip };
    })
  );

  app.post("/users/:userId/deactivate", async (req, reply) =>
    withErrorHandling(req, reply, async () => {
      const user = await requireAuth(req);
      assertRole(user.role, "admin");
      const { userId } = z.object({ userId: z.string() }).parse(req.params);
      const body = DeactivateSchema.parse(req.body);
      const updated = await prisma.user.update({
        where: { id: userId },
        data: { isDeactivated: body.isDeactivated }
      });
      return { user: updated };
    })
  );

  app.get("/jobs", async (req, reply) =>
    withErrorHandling(req, reply, async () => {
      const user = await requireAuth(req);
      assertRole(user.role, "admin");
      const q = PagingSchema.parse(req.query);
      const take = Math.min(q.take ?? 50, 200);
      const skip = q.skip ?? 0;
      const jobs = await prisma.job.findMany({
        orderBy: { createdAt: "desc" },
        take,
        skip,
        include: {
          estimate: true,
          customer: { select: { id: true, name: true } },
          technician: { select: { id: true, name: true } }
        }
      });
      return { jobs, take, skip };
    })
  );
}


