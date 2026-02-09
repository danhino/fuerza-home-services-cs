import type { Server as HttpServer } from "node:http";
import { Server } from "socket.io";
import { prisma } from "./prisma.js";
import { verifySupabaseToken } from "./supabaseAuth.js";

export type RealtimeEvent =
  | { type: "job:request"; jobId: string; customerId: string; trade: string; lat: number; lng: number }
  | { type: "job:status"; jobId: string; status: string }
  | { type: "job:matched"; jobId: string; technicianId: string }
  | { type: "job:estimate_change_requested"; jobId: string; requestId: string }
  | { type: "chat:new"; jobId: string; messageId: string }
  | { type: "tech:location"; technicianId: string; lat: number; lng: number };

export function createIo(server: HttpServer) {
  const io = new Server(server, {
    cors: { origin: true, credentials: true }
  });

  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token as string | undefined;
      if (!token) return next(new Error("missing token"));
      const payload = await verifySupabaseToken(token);
      const userId = payload.sub as string | undefined;
      if (!userId) return next(new Error("invalid token"));
      socket.data.userId = userId;
      next();
    } catch {
      next(new Error("invalid token"));
    }
  });

  io.on("connection", async (socket) => {
    const userId: string = socket.data.userId;
    socket.join(`user:${userId}`);
    socket.on("job:join", (jobId: string) => socket.join(`job:${jobId}`));
    socket.on("job:leave", (jobId: string) => socket.leave(`job:${jobId}`));

    // Convenience: join all active jobs for this user
    const jobs = await prisma.job.findMany({
      where: {
        OR: [{ customerId: userId }, { technicianId: userId }],
        status: { notIn: ["Completed", "Cancelled"] }
      },
      select: { id: true }
    });
    for (const j of jobs) socket.join(`job:${j.id}`);
  });

  return io;
}

export function emitToJob(io: Server, jobId: string, event: RealtimeEvent) {
  io.to(`job:${jobId}`).emit("event", event);
}

export function emitToUser(io: Server, userId: string, event: RealtimeEvent) {
  io.to(`user:${userId}`).emit("event", event);
}


