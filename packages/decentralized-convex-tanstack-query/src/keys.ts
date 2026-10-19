import type { AnyPdsQueryRequest } from "@decentralized-convex/client";

export type PdsQueryKey<Request extends AnyPdsQueryRequest> =
  | readonly ["decentralized-convex", "pds", "query", Request]
  | readonly [
      "decentralized-convex",
      "pds",
      "session",
      string,
      "query",
      Request,
    ];

/**
 * The key prefix of every query in one account session, for invalidating or
 * removing them together, such as on sign-out.
 */
export function pdsSessionQueryKey(session: string) {
  return ["decentralized-convex", "pds", "session", session] as const;
}

/** The cache key of one query, in an account session or none. */
export function pdsQueryKey<Request extends AnyPdsQueryRequest>(
  request: Request,
  session?: string,
): PdsQueryKey<Request> {
  return session === undefined
    ? ["decentralized-convex", "pds", "query", request]
    : [...pdsSessionQueryKey(session), "query", request];
}
