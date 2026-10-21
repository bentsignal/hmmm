import { ConvexError } from "convex/values";

// The PDS's limit on how fast one person sends (send-limits.ts in the
// backend): past it, a send is refused with `RATE_LIMITED` and how long
// until one can go.

/**
 * How long to wait before sending again when the PDS refused a send for
 * going over the sender's limit, or undefined for any other failure.
 */
export function retryAfter(error: unknown) {
  if (!(error instanceof ConvexError)) return undefined;
  const data: unknown = error.data;
  if (typeof data !== "object" || data === null) return undefined;
  if (!("code" in data) || data.code !== "RATE_LIMITED") return undefined;
  const wait = "retryAfterMs" in data ? data.retryAfterMs : undefined;
  return typeof wait === "number" ? Math.max(0, wait) : 1000;
}

