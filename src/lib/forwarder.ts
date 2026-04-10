import type { ChannelForwardRow, ForwardLogRow, MessageRow } from "../types";

const MAX_BACKOFF_MINUTES = 30;

function backoffMinutes(attempt: number): number {
  return Math.min(Math.pow(2, attempt), MAX_BACKOFF_MINUTES);
}

function addMinutes(date: Date, minutes: number): string {
  return new Date(date.getTime() + minutes * 60_000).toISOString();
}

export async function forwardMessage(
  db: D1Database,
  channelId: number,
  messageId: number
): Promise<void> {
  const message = await db
    .prepare("SELECT * FROM messages WHERE id = ?")
    .bind(messageId)
    .first<MessageRow>();

  if (!message) return;

  const { results: forwards } = await db
    .prepare("SELECT * FROM channel_forwards WHERE channel_id = ? AND enabled = 1")
    .bind(channelId)
    .all<ChannelForwardRow>();

  if (forwards.length === 0) return;

  await Promise.allSettled(forwards.map((fwd) => attemptForward(db, message, fwd, 1)));
}

export async function attemptForward(
  db: D1Database,
  message: MessageRow,
  fwd: ChannelForwardRow,
  attempt: number
): Promise<void> {
  const extraHeaders: Record<string, string> = fwd.extra_headers_json
    ? JSON.parse(fwd.extra_headers_json)
    : {};

  let statusCode: number | null = null;
  let error: string | null = null;
  let deliveredAt: string | null = null;
  let nextRetryAt: string | null = null;
  const now = new Date();

  try {
    const res = await fetch(fwd.url, {
      method: fwd.method,
      headers: {
        "Content-Type": "application/json",
        "X-BotMsg-Channel-Id": String(message.channel_id),
        "X-BotMsg-Message-Id": String(message.id),
        ...extraHeaders,
      },
      body: message.payload_json,
    });

    statusCode = res.status;
    if (res.ok) {
      deliveredAt = now.toISOString();
    } else {
      error = `HTTP ${res.status}`;
      if (attempt < fwd.retry_max) {
        nextRetryAt = addMinutes(now, backoffMinutes(attempt));
      }
    }
  } catch (err) {
    error = err instanceof Error ? err.message : String(err);
    if (attempt < fwd.retry_max) {
      nextRetryAt = addMinutes(now, backoffMinutes(attempt));
    }
  }

  await db
    .prepare(
      `INSERT INTO forward_log
         (message_id, forward_id, attempt, status_code, error, next_retry_at, delivered_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(message.id, fwd.id, attempt, statusCode, error, nextRetryAt, deliveredAt)
    .run();
}

export async function retryPendingForwards(db: D1Database): Promise<void> {
  const now = new Date().toISOString();

  const { results: pending } = await db
    .prepare(
      `SELECT fl.*, cf.url, cf.method, cf.extra_headers_json, cf.retry_max,
              m.payload_json, m.channel_id
       FROM forward_log fl
       JOIN channel_forwards cf ON cf.id = fl.forward_id
       JOIN messages m ON m.id = fl.message_id
       WHERE fl.delivered_at IS NULL
         AND fl.next_retry_at IS NOT NULL
         AND fl.next_retry_at <= ?
       ORDER BY fl.next_retry_at ASC
       LIMIT 50`
    )
    .bind(now)
    .all<ForwardLogRow & ChannelForwardRow & Pick<MessageRow, "payload_json" | "channel_id">>();

  await Promise.allSettled(
    pending.map((row) => {
      const message = {
        id: row.message_id,
        channel_id: row.channel_id,
        payload_json: row.payload_json,
      } as MessageRow;
      const fwd = {
        id: row.forward_id,
        url: row.url,
        method: row.method,
        extra_headers_json: row.extra_headers_json,
        retry_max: row.retry_max,
      } as ChannelForwardRow;
      return attemptForward(db, message, fwd, row.attempt + 1);
    })
  );
}

export async function cleanupTimedOutProxyRequests(db: D1Database): Promise<void> {
  const cutoff = new Date(Date.now() - 60_000).toISOString();
  await db
    .prepare(
      `UPDATE proxy_requests SET status = 'timeout', completed_at = datetime('now')
       WHERE status = 'pending' AND created_at <= ?`
    )
    .bind(cutoff)
    .run();
}
