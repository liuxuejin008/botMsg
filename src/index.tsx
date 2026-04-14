import { Hono } from "hono";
import type { AppEnv } from "./types";
import auth from "./routes/auth";
import channels from "./routes/channels";
import sync from "./routes/sync";
import stream from "./routes/stream";
import webhook from "./routes/webhook";
import rules from "./routes/rules";
import forwards from "./routes/forwards";
import members from "./routes/members";
import stats from "./routes/stats";
import ui from "./routes/ui";
import { cleanupTimedOutProxyRequests } from "./lib/forwarder";
import { handleSandboxQueue, handleDLQ } from "./queue-consumer";
import type { Env, SandboxQueueMessage } from "./types";

const app = new Hono<AppEnv>();

// Health endpoints
app.get("/health", (c) => c.json({ status: "ok" }));
app.get("/ping", (c) => c.json({ ok: true }));

// REST API
app.route("/api/auth", auth);
app.route("/api/channels", channels);
app.route("/api", sync);
app.route("/api", stream);
app.route("/api", rules);
app.route("/api", forwards);
app.route("/api", members);
app.route("/api", stats);

// Webhook (public, no auth)
app.route("/", webhook);

// R2 avatar serving
app.get("/avatars/:key", async (c) => {
  const key = c.req.param("key");
  const obj = await c.env.AVATARS.get(key);
  if (!obj) return c.notFound();

  const headers = new Headers();
  obj.writeHttpMetadata(headers);
  headers.set("cache-control", "public, max-age=31536000, immutable");
  return new Response(obj.body, { headers });
});

// UI (server-rendered JSX)
app.route("/", ui);

// ── Cron: 仅做过期数据清理（重试已由 Queue 托管）───────────────────
async function scheduled(_event: ScheduledEvent, env: Env): Promise<void> {
  await cleanupTimedOutProxyRequests(env.DB);
}

export default {
  fetch: app.fetch,
  scheduled,

  // ── Queue Consumer ────────────────────────────────────────────
  async queue(batch: MessageBatch<SandboxQueueMessage>, env: Env): Promise<void> {
    switch (batch.queue) {
      case "botmsg-sandbox":
        await handleSandboxQueue(batch, env);
        break;
      case "botmsg-dlq":
        await handleDLQ(batch, env);
        break;
      default:
        console.warn(`[Queue] Unknown queue: ${batch.queue}`);
    }
  },
};
