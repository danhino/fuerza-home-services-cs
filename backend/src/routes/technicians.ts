import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../prisma.js";
import { withErrorHandling, requireAuth, assertRole } from "./utils.js";
import { haversineKm } from "../geo.js";

const NearbySchema = z.object({
  lat: z.coerce.number(),
  lng: z.coerce.number(),
  trade: z.enum(["plumber", "electrician", "hvac", "cleaning", "pool"]).optional(),
  radiusKm: z.coerce.number().optional(),
  limit: z.coerce.number().optional()
});

const UpdateProfileSchema = z.object({
  trades: z.array(z.enum(["plumber", "electrician", "hvac", "cleaning", "pool"])).optional(),
  serviceRadiusKm: z.number().min(1).max(100).optional(),
  availabilityHoursJson: z.string().optional(),
  licenseDocUrl: z.string().url().optional(),
  insuranceDocUrl: z.string().url().optional()
});

const OnlineSchema = z.object({
  onlineStatus: z.boolean()
});

const LocationSchema = z.object({
  lat: z.number(),
  lng: z.number()
});

export async function technicianRoutes(app: FastifyInstance) {
  app.get("/nearby", async (req, reply) =>
    withErrorHandling(req, reply, async () => {
      const q = NearbySchema.parse(req.query);
      const radiusKm = q.radiusKm ?? 20;
      const limit = Math.min(q.limit ?? 50, 200);

      const techs = await prisma.technicianProfile.findMany({
        where: {
          onlineStatus: true,
          currentLat: { not: null },
          currentLng: { not: null },
          verificationStatus: { not: "rejected" },
          ...(q.trade ? { trades: { has: q.trade } } : {})
        },
        include: {
          user: {
            select: { id: true, name: true, photo: true, rating: true }
          }
        },
        take: 500
      });

      const filtered = techs
        .map((t) => {
          const distKm = haversineKm(q.lat, q.lng, t.currentLat!, t.currentLng!);
          return { ...t, distKm };
        })
        .filter((t) => t.distKm <= radiusKm)
        .sort((a, b) => a.distKm - b.distKm)
        .slice(0, limit)
        .map((t) => ({
          userId: t.userId,
          name: t.user.name,
          photo: t.user.photo,
          rating: t.user.rating,
          trades: t.trades,
          onlineStatus: t.onlineStatus,
          currentLat: t.currentLat,
          currentLng: t.currentLng,
          serviceRadiusKm: t.serviceRadiusKm,
          distKm: t.distKm
        }));

      return { technicians: filtered };
    })
  );

  app.patch("/me/profile", async (req, reply) =>
    withErrorHandling(req, reply, async () => {
      const user = await requireAuth(req);
      assertRole(user.role, "technician");
      const body = UpdateProfileSchema.parse(req.body);
      const profile = await prisma.technicianProfile.upsert({
        where: { userId: user.id },
        create: { userId: user.id, trades: body.trades ?? [], ...body },
        update: body
      });
      return { technicianProfile: profile };
    })
  );

  app.post("/me/online", async (req, reply) =>
    withErrorHandling(req, reply, async () => {
      const user = await requireAuth(req);
      assertRole(user.role, "technician");
      const body = OnlineSchema.parse(req.body);
      const profile = await prisma.technicianProfile.upsert({
        where: { userId: user.id },
        create: { userId: user.id, trades: [], onlineStatus: body.onlineStatus },
        update: { onlineStatus: body.onlineStatus }
      });
      return { technicianProfile: profile };
    })
  );

  app.post("/me/location", async (req, reply) =>
    withErrorHandling(req, reply, async () => {
      const user = await requireAuth(req);
      assertRole(user.role, "technician");
      const body = LocationSchema.parse(req.body);
      const profile = await prisma.technicianProfile.update({
        where: { userId: user.id },
        data: { currentLat: body.lat, currentLng: body.lng }
      });

      app.io.to(`user:${user.id}`).emit("event", {
        type: "tech:location",
        technicianId: user.id,
        lat: body.lat,
        lng: body.lng
      });
      return { technicianProfile: profile };
    })
  );
}


