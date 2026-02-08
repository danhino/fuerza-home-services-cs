import fs from "node:fs";
import apn from "apn";
import { prisma } from "./prisma.js";
import { getEnv } from "./env.js";

export type PushPayload = {
  title: string;
  body: string;
  data?: Record<string, string>;
};

let provider: apn.Provider | null = null;

function getProvider(): apn.Provider | null {
  const env = getEnv();
  if (provider) return provider;
  if (!env.APNS_TEAM_ID || !env.APNS_KEY_ID || !env.APNS_PRIVATE_KEY_P8_PATH) {
    return null;
  }
  const key = fs.readFileSync(env.APNS_PRIVATE_KEY_P8_PATH, "utf8");
  provider = new apn.Provider({
    token: {
      key,
      keyId: env.APNS_KEY_ID,
      teamId: env.APNS_TEAM_ID
    },
    production: env.APNS_PRODUCTION
  });
  return provider;
}

export async function sendPushToUser(userId: string, payload: PushPayload) {
  const env = getEnv();
  const devices = await prisma.device.findMany({
    where: { userId },
    select: { token: true }
  });

  if (devices.length === 0) return;

  const apnProvider = getProvider();
  if (!apnProvider) {
    // Dev fallback: log instead of sending
    console.log("[push][dev]", { userId, payload, tokens: devices.length });
    return;
  }

  const note = new apn.Notification();
  note.topic = env.APNS_BUNDLE_ID;
  note.alert = { title: payload.title, body: payload.body };
  note.payload = payload.data ?? {};
  note.sound = "default";

  const tokens = devices.map((d) => d.token);
  await apnProvider.send(note, tokens);
}


