import Fastify from "fastify";
import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import { meRoutes } from "./routes/me.js";
import { technicianRoutes } from "./routes/technicians.js";
import { jobsRoutes } from "./routes/jobs.js";
import { deviceRoutes } from "./routes/devices.js";
import { adminRoutes } from "./routes/admin.js";

export function buildApp() {
  const app = Fastify({
    logger: true
  });

  app.register(cors, { origin: true, credentials: true });
  app.register(rateLimit, { max: 200, timeWindow: "1 minute" });

  app.register(swagger, {
    openapi: {
      info: { title: "Fuerza Home Services API", version: "0.1.0" }
    }
  });
  app.register(swaggerUi, { routePrefix: "/docs" });

  app.get("/health", async () => ({ ok: true }));

  app.register(meRoutes, { prefix: "/me" });
  app.register(technicianRoutes, { prefix: "/technicians" });
  app.register(jobsRoutes, { prefix: "/jobs" });
  app.register(deviceRoutes, { prefix: "/devices" });
  app.register(adminRoutes, { prefix: "/admin" });

  return app;
}


