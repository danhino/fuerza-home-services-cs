import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../prisma.js";
import { withErrorHandling, requireAuth, assertRole } from "./utils.js";
import { getFlatEstimateCents } from "../pricing.js";
import { assertJobTransition, isTerminalStatus } from "../jobMachine.js";
import { haversineKm } from "../geo.js";
import { emitToJob, emitToUser } from "../realtime.js";
import { sendPushToUser } from "../push.js";
import { getEnv } from "../env.js";
import { getStripe } from "../stripeClient.js";
import type { JobStatus } from "@prisma/client";

const TradeSchema = z.enum(["plumber", "electrician", "hvac", "cleaning", "pool"]);

const EstimateSchema = z.object({
  trade: TradeSchema
});

const CreateJobSchema = z.object({
  trade: TradeSchema,
  description: z.string().min(5).max(2000),
  photos: z.array(z.string().url()).optional(),
  address: z.string().min(3),
  lat: z.number(),
  lng: z.number(),
  isAsap: z.boolean().default(true),
  scheduledAt: z.string().datetime().optional()
});

const SetStatusSchema = z.object({
  status: z.enum([
    "EnRoute",
    "Arrived",
    "Diagnosing",
    "Working",
    "Completed",
    "Cancelled"
  ])
});

const ProposeEstimateSchema = z.object({
  newAmountCents: z.number().int().min(1000).max(500000),
  reason: z.string().min(3).max(500)
});

const RespondEstimateSchema = z.object({
  decision: z.enum(["Approved", "Declined"])
});

const ChatSchema = z.object({
  message: z.string().min(1).max(2000)
});

const CreatePaymentIntentSchema = z.object({
  method: z.enum(["ApplePay", "Card"])
});

async function getJobForUser(jobId: string, userId: string) {
  const job = await prisma.job.findUnique({
    where: { id: jobId },
    include: {
      estimate: true,
      estimateChangeRequests: {
        orderBy: { createdAt: "asc" },
        include: {
          proposedBy: { select: { id: true, name: true } }
        }
      },
      customer: { select: { id: true, name: true, photo: true, rating: true } },
      technician: { select: { id: true, name: true, photo: true, rating: true } },
      payment: true,
      chat: { orderBy: { createdAt: "asc" }, take: 200 }
    }
  });
  if (!job) throw new Error("Job not found");
  if (job.customerId !== userId && job.technicianId !== userId) throw new Error("Forbidden");
  return job;
}

export async function jobsRoutes(app: FastifyInstance) {
  app.post("/estimate", async (req, reply) =>
    withErrorHandling(req, reply, async () => {
      const user = await requireAuth(req);
      assertRole(user.role, "customer");
      const body = EstimateSchema.parse(req.body);
      const amountCents = getFlatEstimateCents(body.trade);
      return { amountCents, currency: getEnv().STRIPE_CURRENCY };
    })
  );

  app.post("/", async (req, reply) =>
    withErrorHandling(req, reply, async () => {
      const user = await requireAuth(req);
      assertRole(user.role, "customer");
      const body = CreateJobSchema.parse(req.body);
      const amountCents = getFlatEstimateCents(body.trade);
      const currency = getEnv().STRIPE_CURRENCY;

      const job = await prisma.job.create({
        data: {
          customerId: user.id,
          trade: body.trade,
          description: body.description,
          photos: body.photos ?? [],
          address: body.address,
          lat: body.lat,
          lng: body.lng,
          isAsap: body.isAsap,
          scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : null,
          status: "Requested",
          estimate: {
            create: {
              originalAmountCents: amountCents,
              currentAmountCents: amountCents,
              currency
            }
          }
        },
        include: { estimate: true }
      });

      // Broadcast to nearby online techs for this trade (MVP matching)
      const techs = await prisma.technicianProfile.findMany({
        where: {
          onlineStatus: true,
          currentLat: { not: null },
          currentLng: { not: null },
          trades: { has: body.trade },
          verificationStatus: { not: "rejected" }
        },
        select: {
          userId: true,
          currentLat: true,
          currentLng: true,
          serviceRadiusKm: true
        },
        take: 1000
      });

      const candidates = techs
        .map((t) => ({
          ...t,
          distKm: haversineKm(body.lat, body.lng, t.currentLat!, t.currentLng!)
        }))
        .filter((t) => t.distKm <= t.serviceRadiusKm)
        .sort((a, b) => a.distKm - b.distKm)
        .slice(0, 25);

      for (const t of candidates) {
        emitToUser(app.io, t.userId, {
          type: "job:request",
          jobId: job.id,
          customerId: user.id,
          trade: body.trade,
          lat: body.lat,
          lng: body.lng
        });
        void sendPushToUser(t.userId, {
          title: "New job request",
          body: `${body.trade.toUpperCase()} • ${body.description.slice(0, 60)}`,
          data: { jobId: job.id, type: "job_request" }
        });
      }

      return { job };
    })
  );

  app.get("/:jobId", async (req, reply) =>
    withErrorHandling(req, reply, async () => {
      const user = await requireAuth(req);
      const { jobId } = z.object({ jobId: z.string() }).parse(req.params);
      const job = await getJobForUser(jobId, user.id);
      return { job };
    })
  );

  app.post("/:jobId/accept", async (req, reply) =>
    withErrorHandling(req, reply, async () => {
      const user = await requireAuth(req);
      assertRole(user.role, "technician");
      const { jobId } = z.object({ jobId: z.string() }).parse(req.params);

      const job = await prisma.job.findUnique({ where: { id: jobId }, include: { estimate: true } });
      if (!job) throw new Error("Job not found");
      if (job.status !== "Requested") throw new Error("Job is not available");
      if (job.technicianId) throw new Error("Job already matched");

      const updated = await prisma.job.update({
        where: { id: jobId },
        data: { technicianId: user.id, status: "Matched" },
        include: { estimate: true }
      });

      emitToJob(app.io, jobId, { type: "job:matched", jobId, technicianId: user.id });
      emitToJob(app.io, jobId, { type: "job:status", jobId, status: "Matched" });
      void sendPushToUser(updated.customerId, {
        title: "Technician matched",
        body: "A technician accepted your request.",
        data: { jobId, type: "job_matched" }
      });

      return { job: updated };
    })
  );

  app.post("/:jobId/status", async (req, reply) =>
    withErrorHandling(req, reply, async () => {
      const user = await requireAuth(req);
      const { jobId } = z.object({ jobId: z.string() }).parse(req.params);
      const body = SetStatusSchema.parse(req.body);

      const job = await prisma.job.findUnique({ where: { id: jobId } });
      if (!job) throw new Error("Job not found");
      if (isTerminalStatus(job.status)) throw new Error("Job is closed");

      const isTech = job.technicianId === user.id;
      const isCustomer = job.customerId === user.id;

      if (body.status === "Cancelled") {
        if (!isTech && !isCustomer) throw new Error("Forbidden");
        const updated = await prisma.job.update({ where: { id: jobId }, data: { status: "Cancelled" } });
        emitToJob(app.io, jobId, { type: "job:status", jobId, status: "Cancelled" });
        const other = isTech ? updated.customerId : updated.technicianId;
        if (other) {
          void sendPushToUser(other, {
            title: "Job cancelled",
            body: "The job was cancelled.",
            data: { jobId, type: "job_cancelled" }
          });
        }
        return { job: updated };
      }

      // Non-cancel transitions are technician-driven
      if (!isTech) throw new Error("Forbidden");

      assertJobTransition(job.status, body.status as JobStatus);

      if (job.status === "AwaitingEstimateApproval") {
        throw new Error("Awaiting estimate approval");
      }

      const updated = await prisma.job.update({
        where: { id: jobId },
        data: { status: body.status as JobStatus }
      });
      emitToJob(app.io, jobId, { type: "job:status", jobId, status: updated.status });

      const notifyUserId = updated.customerId;
      const statusLabel = updated.status === "EnRoute"
        ? "Technician is on the way"
        : updated.status === "Arrived"
          ? "Technician arrived"
          : updated.status === "Completed"
            ? "Job completed"
            : "Job update";

      void sendPushToUser(notifyUserId, {
        title: statusLabel,
        body: `Status: ${updated.status}`,
        data: { jobId, type: "job_status" }
      });

      return { job: updated };
    })
  );

  app.post("/:jobId/estimate-change", async (req, reply) =>
    withErrorHandling(req, reply, async () => {
      const user = await requireAuth(req);
      assertRole(user.role, "technician");
      const { jobId } = z.object({ jobId: z.string() }).parse(req.params);
      const body = ProposeEstimateSchema.parse(req.body);

      const job = await prisma.job.findUnique({
        where: { id: jobId },
        include: { estimate: true }
      });
      if (!job) throw new Error("Job not found");
      if (job.technicianId !== user.id) throw new Error("Forbidden");
      if (!job.estimate) throw new Error("Missing estimate");
      if (!["Arrived", "Diagnosing", "Working"].includes(job.status)) {
        throw new Error("Estimate change not allowed yet");
      }

      const reqRow = await prisma.estimateChangeRequest.create({
        data: {
          jobId,
          proposedByUserId: user.id,
          oldAmountCents: job.estimate.currentAmountCents,
          newAmountCents: body.newAmountCents,
          reason: body.reason
        }
      });

      const updated = await prisma.job.update({
        where: { id: jobId },
        data: { status: "AwaitingEstimateApproval" }
      });

      emitToJob(app.io, jobId, {
        type: "job:estimate_change_requested",
        jobId,
        requestId: reqRow.id
      });
      emitToJob(app.io, jobId, { type: "job:status", jobId, status: updated.status });
      void sendPushToUser(updated.customerId, {
        title: "Estimate change requested",
        body: "Approve or decline the new estimate to continue.",
        data: { jobId, requestId: reqRow.id, type: "estimate_change" }
      });

      return { estimateChangeRequest: reqRow, job: updated };
    })
  );

  app.post("/:jobId/estimate-change/:requestId/respond", async (req, reply) =>
    withErrorHandling(req, reply, async () => {
      const user = await requireAuth(req);
      assertRole(user.role, "customer");
      const { jobId, requestId } = z
        .object({ jobId: z.string(), requestId: z.string() })
        .parse(req.params);
      const body = RespondEstimateSchema.parse(req.body);

      const job = await prisma.job.findUnique({
        where: { id: jobId },
        include: { estimate: true }
      });
      if (!job) throw new Error("Job not found");
      if (job.customerId !== user.id) throw new Error("Forbidden");
      if (!job.estimate) throw new Error("Missing estimate");

      const changeReq = await prisma.estimateChangeRequest.findUnique({ where: { id: requestId } });
      if (!changeReq || changeReq.jobId !== jobId) throw new Error("Request not found");
      if (changeReq.status !== "Pending") throw new Error("Request already decided");

      if (body.decision === "Approved") {
        await prisma.estimate.update({
          where: { jobId },
          data: { currentAmountCents: changeReq.newAmountCents }
        });
      }

      const decided = await prisma.estimateChangeRequest.update({
        where: { id: requestId },
        data: {
          status: body.decision,
          decidedAt: new Date()
        }
      });

      const nextStatus = "Diagnosing";
      const updatedJob = await prisma.job.update({
        where: { id: jobId },
        data: { status: nextStatus }
      });

      emitToJob(app.io, jobId, { type: "job:status", jobId, status: updatedJob.status });
      const techId = job.technicianId;
      if (techId) {
        void sendPushToUser(techId, {
          title: `Estimate ${body.decision.toLowerCase()}`,
          body:
            body.decision === "Approved"
              ? "Customer approved the new estimate."
              : "Customer declined the estimate change.",
          data: { jobId, requestId, type: "estimate_change_decision" }
        });
      }

      return { estimateChangeRequest: decided, job: updatedJob };
    })
  );

  app.post("/:jobId/chat", async (req, reply) =>
    withErrorHandling(req, reply, async () => {
      const user = await requireAuth(req);
      const { jobId } = z.object({ jobId: z.string() }).parse(req.params);
      const body = ChatSchema.parse(req.body);
      const job = await prisma.job.findUnique({ where: { id: jobId } });
      if (!job) throw new Error("Job not found");
      if (job.customerId !== user.id && job.technicianId !== user.id) throw new Error("Forbidden");

      const msg = await prisma.chatMessage.create({
        data: {
          jobId,
          senderId: user.id,
          message: body.message
        }
      });

      emitToJob(app.io, jobId, { type: "chat:new", jobId, messageId: msg.id });
      const other = user.id === job.customerId ? job.technicianId : job.customerId;
      if (other) {
        void sendPushToUser(other, {
          title: user.name,
          body: body.message.slice(0, 80),
          data: { jobId, type: "chat" }
        });
      }
      return { chatMessage: msg };
    })
  );

  app.post("/:jobId/payment-intent", async (req, reply) =>
    withErrorHandling(req, reply, async () => {
      const env = getEnv();
      const user = await requireAuth(req);
      assertRole(user.role, "customer");
      const { jobId } = z.object({ jobId: z.string() }).parse(req.params);
      const body = CreatePaymentIntentSchema.parse(req.body);

      const job = await prisma.job.findUnique({
        where: { id: jobId },
        include: { estimate: true, payment: true }
      });
      if (!job) throw new Error("Job not found");
      if (job.customerId !== user.id) throw new Error("Forbidden");
      if (job.status !== "Completed") throw new Error("Job not completed");
      if (!job.estimate) throw new Error("Missing estimate");

      const stripe = getStripe();
      const amountCents = job.estimate.currentAmountCents;
      const currency = job.estimate.currency;

      const pi = await stripe.paymentIntents.create({
        amount: amountCents,
        currency,
        automatic_payment_methods: { enabled: true },
        metadata: { jobId }
      });

      const payment = await prisma.payment.upsert({
        where: { jobId },
        create: {
          jobId,
          amountCents,
          currency,
          status: "RequiresConfirmation",
          method: body.method,
          stripePaymentIntentId: pi.id
        },
        update: {
          amountCents,
          currency,
          status: "RequiresConfirmation",
          method: body.method,
          stripePaymentIntentId: pi.id
        }
      });

      return {
        payment,
        stripe: {
          clientSecret: pi.client_secret,
          publishableKeyHint: "Set Stripe publishable key in iOS app config",
          platformFeePercent: env.PLATFORM_FEE_PERCENT
        }
      };
    })
  );
}


