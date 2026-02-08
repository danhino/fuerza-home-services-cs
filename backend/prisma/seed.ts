import { prisma } from "../src/prisma.js";
import { Trade, UserRole } from "@prisma/client";

async function main() {
  // Clear (dev only)
  await prisma.payment.deleteMany();
  await prisma.chatMessage.deleteMany();
  await prisma.estimateChangeRequest.deleteMany();
  await prisma.estimate.deleteMany();
  await prisma.job.deleteMany();
  await prisma.device.deleteMany();
  await prisma.savedAddress.deleteMany();
  await prisma.paymentMethod.deleteMany();
  await prisma.technicianProfile.deleteMany();
  await prisma.customerProfile.deleteMany();
  await prisma.otpCode.deleteMany();
  await prisma.user.deleteMany();

  const admin = await prisma.user.create({
    data: {
      role: UserRole.admin,
      name: "Fuerza Admin",
      email: "admin@fuerza.local",
      rating: 5
    }
  });

  const customer = await prisma.user.create({
    data: {
      role: UserRole.customer,
      name: "Carmen Customer",
      email: "customer@fuerza.local",
      rating: 4.9,
      customerProfile: {
        create: {
          savedAddresses: {
            create: [
              {
                label: "Home",
                address: "123 Main St, Austin, TX",
                lat: 30.2672,
                lng: -97.7431
              }
            ]
          }
        }
      }
    }
  });

  const tech1 = await prisma.user.create({
    data: {
      role: UserRole.technician,
      name: "Tony Tech (Plumber)",
      email: "plumber@fuerza.local",
      rating: 4.8,
      technicianProfile: {
        create: {
          trades: [Trade.plumber],
          onlineStatus: true,
          currentLat: 30.2705,
          currentLng: -97.749,
          serviceRadiusKm: 25,
          verificationStatus: "verified",
          completedJobs: 120
        }
      }
    }
  });

  const tech2 = await prisma.user.create({
    data: {
      role: UserRole.technician,
      name: "Elena Electric",
      email: "electric@fuerza.local",
      rating: 4.7,
      technicianProfile: {
        create: {
          trades: [Trade.electrician],
          onlineStatus: true,
          currentLat: 30.2602,
          currentLng: -97.7301,
          serviceRadiusKm: 18,
          verificationStatus: "verified",
          completedJobs: 80
        }
      }
    }
  });

  const job = await prisma.job.create({
    data: {
      customerId: customer.id,
      trade: Trade.plumber,
      description: "Kitchen sink is clogged and backing up.",
      photos: [],
      address: "123 Main St, Austin, TX",
      lat: 30.2672,
      lng: -97.7431,
      status: "Requested",
      estimate: {
        create: {
          originalAmountCents: 14900,
          currentAmountCents: 14900,
          currency: "usd"
        }
      }
    }
  });

  // A matched / in-progress job
  await prisma.job.create({
    data: {
      customerId: customer.id,
      technicianId: tech1.id,
      trade: Trade.plumber,
      description: "Water heater making loud noises.",
      photos: [],
      address: "123 Main St, Austin, TX",
      lat: 30.2672,
      lng: -97.7431,
      status: "EnRoute",
      estimate: {
        create: {
          originalAmountCents: 19900,
          currentAmountCents: 19900,
          currency: "usd"
        }
      },
      chat: {
        create: [
          { senderId: customer.id, message: "Hi! Can you give me an ETA?" },
          { senderId: tech1.id, message: "On my way — about 12 minutes." }
        ]
      }
    }
  });

  console.log("Seeded:", {
    adminEmail: admin.email,
    customerEmail: customer.email,
    technicianEmails: [tech1.email, tech2.email],
    sampleRequestedJobId: job.id
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });


