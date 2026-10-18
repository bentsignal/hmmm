import type {
  DiscoveredPds,
  FederationAuthTokenFetcher,
} from "@decentralized-convex/client";
import * as SecureStore from "expo-secure-store";

import type { HomeAuthClient } from "./auth-client";

interface CachedToken {
  readonly expiresAt: number;
  readonly token: string;
}

function assertionOf(value: unknown) {
  if (
    typeof value === "object" &&
    value !== null &&
    "assertion" in value &&
    typeof value.assertion === "string"
  ) {
    return value.assertion;
  }
  throw new Error("Home PDS returned an invalid identity proof");
}

function exchangeOf(value: unknown) {
  if (
    typeof value === "object" &&
    value !== null &&
    "expiresAt" in value &&
    "token" in value &&
    typeof value.expiresAt === "number" &&
    typeof value.token === "string"
  ) {
    return { expiresAt: value.expiresAt, token: value.token };
  }
  throw new Error("Remote PDS returned an invalid token");
}

async function postJson(
  url: string,
  body: object,
  headers: Readonly<Record<string, string>> = {},
) {
  const response = await fetch(url, {
    body: JSON.stringify(body),
    headers: { ...headers, "content-type": "application/json" },
    method: "POST",
  });
  if (!response.ok) {
    throw new Error(`PDS authentication failed (${response.status})`);
  }
  return response;
}

async function exchangeToken(
  authClient: HomeAuthClient,
  home: DiscoveredPds,
  target: DiscoveredPds,
) {
  const session = await authClient.getSession();
  const sessionToken = session.data?.session.token;
  if (sessionToken === undefined) return null;
  const proof = await postJson(
    `${home.manifest.httpUrl}/api/auth/federation/assertion`,
    { audience: target.domain },
    { authorization: `Bearer ${sessionToken}` },
  );
  const assertion = assertionOf(await proof.json());
  const exchange = await postJson(
    `${target.manifest.httpUrl}/api/auth/federation/exchange`,
    { assertion },
  );
  return exchangeOf(await exchange.json());
}

export async function homeToken(authClient: HomeAuthClient) {
  const { data } = await authClient.convex.token({
    fetchOptions: { throw: false },
  });
  return data?.token ?? null;
}

function expiryIn(payload: unknown) {
  return typeof payload === "object" &&
    payload !== null &&
    "exp" in payload &&
    typeof payload.exp === "number"
    ? payload.exp
    : 0;
}

/** When a JWT expires, in seconds since the epoch; 0 if it can't be read. */
function expiryOf(token: string) {
  try {
    const encoded = (token.split(".")[1] ?? "")
      .replaceAll("-", "+")
      .replaceAll("_", "/");
    const padded = encoded.padEnd(Math.ceil(encoded.length / 4) * 4, "=");
    return expiryIn(JSON.parse(atob(padded)));
  } catch {
    return 0;
  }
}

/** Where an account keeps its last home token (see `savedHomeToken`). */
function homeTokenKey(storagePrefix: string) {
  return `${storagePrefix}_home_token`;
}

/** Forgets an account's saved home token, as it signs out. */
export function forgetHomeToken(storagePrefix: string) {
  void SecureStore.deleteItemAsync(homeTokenKey(storagePrefix)).catch(
    () => null,
  );
}

/**
 * Uses the Better Auth session for the home PDS, and exchanges a short-lived
 * home assertion for a token on any other PDS a query reaches.
 *
 * The home token is saved, so the app's first queries go out with it
 * rather than waiting for a new one: the connection doesn't send anything
 * until it has a token. One that has expired (or that the PDS turns down,
 * which asks again with `forceRefreshToken`) is replaced.
 */
export function createFederationAuthTokenFetcher(
  authClient: HomeAuthClient,
  home: DiscoveredPds,
  storagePrefix: string,
) {
  const cache = new Map<string, CachedToken>();
  const key = homeTokenKey(storagePrefix);

  async function savedHomeToken(forceRefreshToken: boolean) {
    const saved = forceRefreshToken ? null : SecureStore.getItem(key);
    if (saved !== null && expiryOf(saved) > Date.now() / 1_000 + 60) {
      return saved;
    }
    const token = await homeToken(authClient);
    // Saved without waiting. A failed request (offline, say) leaves the
    // last one, which lapses on its own or goes when the account signs out.
    if (token !== null) {
      void SecureStore.setItemAsync(key, token).catch(() => null);
    }
    return token;
  }

  function cached(url: string, forceRefreshToken: boolean) {
    const entry = cache.get(url);
    if (forceRefreshToken || entry === undefined) return null;
    return entry.expiresAt > Date.now() / 1_000 + 30 ? entry.token : null;
  }

  async function fetchToken({
    forceRefreshToken,
    pds,
    url,
  }: Parameters<FederationAuthTokenFetcher>[0]) {
    if (url === home.manifest.deploymentUrl) {
      return savedHomeToken(forceRefreshToken);
    }
    if (pds === undefined) return null;
    const reused = cached(url, forceRefreshToken);
    if (reused !== null) return reused;
    const token = await exchangeToken(authClient, home, pds);
    if (token !== null) cache.set(url, token);
    return token?.token ?? null;
  }
  return fetchToken;
}
