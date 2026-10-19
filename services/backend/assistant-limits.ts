// The decisions behind assistant rate limits (convex/rateLimits.ts), as
// plain functions so they can be tested without Convex.

export const REPLIES_PER_HOUR = 300;
const PERIOD = 60 * 60 * 1000;
const REFILL = PERIOD / REPLIES_PER_HOUR;
export const STRIKES_PER_DAY = 5;
const DAY = 24 * 60 * 60 * 1000;

/** How every automatic limit notice starts, so the model can tell it didn't write it. */
export const LIMIT_NOTICE_START = "You've hit the";

export interface Bucket {
  accountId: string;
  limited?: boolean;
  lockNoticeSent?: boolean;
  strikes?: number;
  strikesSince?: number;
  tokens: number;
  updatedAt: number;
}

/** Replies left now, from what was left at `updatedAt`. */
export function refilled(tokens: number, updatedAt: number, now: number) {
  return Math.min(REPLIES_PER_HOUR, tokens + (now - updatedAt) / REFILL);
}

/** The person's bucket now: refilled, and with yesterday's strikes cleared. */
export function current(
  bucket: Bucket | null,
  accountId: string,
  now: number,
): Bucket {
  if (bucket === null) {
    return { accountId, tokens: REPLIES_PER_HOUR, updatedAt: now };
  }
  const fresh =
    bucket.strikesSince === undefined || now - bucket.strikesSince >= DAY;
  return {
    accountId,
    limited: bucket.limited,
    ...(!fresh && {
      lockNoticeSent: bucket.lockNoticeSent,
      strikes: bucket.strikes,
      strikesSince: bucket.strikesSince,
    }),
    tokens: refilled(bucket.tokens, bucket.updatedAt, now),
    updatedAt: now,
  };
}

export function decide(bucket: Bucket, now: number) {
  const strikes = bucket.strikes ?? 0;
  const lockedUntil = (bucket.strikesSince ?? now) + DAY;
  if (strikes >= STRIKES_PER_DAY) {
    const notice =
      bucket.lockNoticeSent === true ? null : lockNotice(lockedUntil - now);
    return { bucket: { ...bucket, lockNoticeSent: true }, notice, ok: false };
  }
  if (bucket.tokens >= 1) {
    return {
      bucket: { ...bucket, limited: undefined, tokens: bucket.tokens - 1 },
      notice: null,
      ok: true,
    };
  }
  // Still in the same stretch at the limit: no new strike, no new notice.
  if (bucket.limited === true) return { bucket, notice: null, ok: false };
  const struck = {
    ...bucket,
    limited: true,
    strikes: strikes + 1,
    strikesSince: bucket.strikesSince ?? now,
  };
  if (struck.strikes >= STRIKES_PER_DAY) {
    return {
      bucket: { ...struck, lockNoticeSent: true },
      notice: lockNotice(struck.strikesSince + DAY - now),
      ok: false,
    };
  }
  return {
    bucket: struck,
    notice: limitNotice(Math.ceil((1 - bucket.tokens) * REFILL)),
    ok: false,
  };
}

function limitNotice(retryAfter: number) {
  const minutes = Math.ceil(retryAfter / 60_000);
  const when =
    minutes <= 1 ? "in a minute" : `in about ${String(minutes)} minutes`;
  return `${LIMIT_NOTICE_START} limit of ${String(REPLIES_PER_HOUR)} messages an hour with Vera's assistants. Try again ${when}.`;
}

function lockNotice(retryAfter: number) {
  const hours = Math.max(1, Math.ceil(retryAfter / (60 * 60 * 1000)));
  return `${LIMIT_NOTICE_START} hourly limit too many times today, so Vera's assistants are paused for you. Try again in about ${String(hours)} ${hours === 1 ? "hour" : "hours"}.`;
}
