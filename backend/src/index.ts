import dotenv from "dotenv";
dotenv.config();

import { buildApp } from "./app.js";
import { getEnv } from "./env.js";
import { createIo } from "./realtime.js";

const env = getEnv();
const app = buildApp();

await app.ready();

// Socket.IO shares the same HTTP server
const io = createIo(app.server);
app.io = io;

await app.listen({ port: env.PORT, host: "0.0.0.0" });


