import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../prisma.js";
import { withErrorHandling, requireAuth } from "./utils.js";

const RegisterSchema = z.object({
  token: z.string().min(20),
  sandbox: z.boolean().default(true),
  platform: z.string().default("ios")
});

export async function deviceRoutes(app: FastifyInstance) {
  app.post("/register", async (req, reply) =>
    withErrorHandling(req, reply, async () => {
      const user = await requireAuth(req);
      const body = RegisterSchema.parse(req.body);
      const device = await prisma.device.upsert({
        where: { token: body.token },
        create: {
          userId: user.id,
          token: body.token,
          sandbox: body.sandbox,
          platform: body.platform
        },
        update: {
          userId: user.id,
          sandbox: body.sandbox,
          platform: body.platform
        }
      });
      return { device };
    })
  );
}


