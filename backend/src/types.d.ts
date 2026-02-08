import "fastify";
import type { Server } from "socket.io";
import type { User } from "@prisma/client";

declare module "fastify" {
  interface FastifyInstance {
    io: Server;
  }
  interface FastifyRequest {
    user?: User;
  }
}


