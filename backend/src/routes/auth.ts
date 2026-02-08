import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../prisma.js";
import { generateOtpCode, hashOtp } from "../auth.js";
import { getEnv } from "../env.js";
import type { UserRole } from "@prisma/client";
import { withErrorHandling } from "./utils.js";

const StartSchema = z.object({
  channel: z.enum(["phone", "email"]),
  target: z.string().min(3)
});

const VerifySchema = z.object({
  channel: z.enum(["phone", "email"]),
  target: z.string().min(3),
  code: z.string().regex(/^\d{6}$/),
  name: z.string().min(1).optional(),
  role: z.enum(["customer", "technician", "both"]).optional()
});

export async function authRoutes(app: FastifyInstance) {
  const env = getEnv();

  app.post("/start", async (req, reply) =>
    withErrorHandling(req, reply, async () => {
      const body = StartSchema.parse(req.body);
      const code = generateOtpCode();
      const codeHash = hashOtp(code);
      const expiresAt = new Date(Date.now() + env.OTP_TTL_SECONDS * 1000);

      await prisma.otpCode.create({
        data: {
          channel: body.channel,
          target: body.target,
          codeHash,
          expiresAt
        }
      });

      // MVP: do not send SMS/email; log in dev.
      if (env.NODE_ENV !== "production") {
        console.log(`[otp][dev] ${body.channel}=${body.target} code=${code}`);
        return { devCode: code, expiresAt };
      }
      return { expiresAt };
    })
  );

  app.post("/verify", async (req, reply) =>
    withErrorHandling(req, reply, async () => {
      const body = VerifySchema.parse(req.body);
      const codeHash = hashOtp(body.code);

      const otp = await prisma.otpCode.findFirst({
        where: {
          channel: body.channel,
          target: body.target,
          codeHash,
          consumedAt: null,
          expiresAt: { gt: new Date() }
        },
        orderBy: { createdAt: "desc" }
      });
      if (!otp) throw new Error("Invalid or expired code");

      await prisma.otpCode.update({
        where: { id: otp.id },
        data: { consumedAt: new Date() }
      });

      const role = (body.role ?? "customer") as Exclude<UserRole, "admin">;
      const where = body.channel === "phone" ? { phone: body.target } : { email: body.target };

      let user = await prisma.user.findUnique({ where });
      if (!user) {
        if (!body.name) throw new Error("Name is required for first login");
        user = await prisma.user.create({
          data: {
            role,
            name: body.name,
            phone: body.channel === "phone" ? body.target : null,
            email: body.channel === "email" ? body.target : null,
            customerProfile: role === "technician" ? undefined : { create: {} },
            technicianProfile: role === "customer" ? undefined : { create: { trades: [] } }
          }
        });
      }

      // Ensure profiles exist if role expanded / set on verify
      if (body.role && user.role !== role) {
        user = await prisma.user.update({ where: { id: user.id }, data: { role } });
      }
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

      const token = await reply.jwtSign({ userId: user.id });
      return {
        token,
        user: {
          id: user.id,
          role: user.role,
          name: user.name,
          phone: user.phone,
          email: user.email,
          photo: user.photo,
          rating: user.rating,
          createdAt: user.createdAt
        }
      };
    })
  );
}


