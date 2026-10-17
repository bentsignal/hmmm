import type { DiscoveredPds } from "@decentralized-convex/client";
import { QueryClient } from "@tanstack/react-query";
import { DecentralizedConvexClient } from "@decentralized-convex/client";
import {
  PdsQueryClient,
  pdsSessionQueryKey,
} from "@decentralized-convex/tanstack-query";
import { ConvexHttpClient } from "convex/browser";

import type { StoredAccount } from "./account-store";
import { forgetAccountNotifications } from "~/features/notifications/presented";
import { removeStoredAccount, storedAccounts } from "./account-store";
import { createHomeAuthClient } from "./auth-client";
import { createFederationAuthTokenFetcher, homeToken } from "./federation-auth";

/**
 * The app's one TanStack cache. Every signed-in account's PDS queries live
 * here, keyed by the account's address. A screen closed in the last ten
 * minutes (as long as a conversation reuses its pages) shows its last
 * results right away when it opens again.
 */
export const queryClient = new QueryClient({
  defaultOptions: { queries: { gcTime: 10 * 60 * 1000 } },
});

function createAccountSession(stored: StoredAccount, home: DiscoveredPds) {
  const authClient = createHomeAuthClient(home, stored.storagePrefix);
  const transport = new DecentralizedConvexClient({
    getAuthToken: createFederationAuthTokenFetcher(authClient, home),
    pds: { home },
  });
  const pdsClient = new PdsQueryClient(transport, {
    session: stored.address,
  });
  pdsClient.connect(queryClient);
  // Connects and signs in while the first screen renders, rather than once
  // its queries start.
  transport.connectHome();
  // The Better Auth client is a Proxy that answers every property, so it
  // stays out of this object: in development React reads the props it
  // re-renders with to log them, and turning the proxy's `name` into text
  // throws mid-commit, which froze the app when an account signed out.
  return {
    address: stored.address,
    /** Ends this account's session on its home PDS. */
    authSignOut: () => authClient.signOut(),
    /** This account's session on its home PDS, or null once it's ended. */
    authSession: () => authClient.getSession(),
    /** A Convex client for the home deployment, signed in as this account. */
    convex: async () => {
      const client = new ConvexHttpClient(home.manifest.deploymentUrl);
      const token = await homeToken(authClient);
      if (token !== null) client.setAuth(token);
      return client;
    },
    home,
    pds: pdsClient,
    storagePrefix: stored.storagePrefix,
    transport,
    username: stored.address.slice(0, stored.address.lastIndexOf("@")),
  };
}

export type AccountSession = ReturnType<typeof createAccountSession>;

const sessions = new Map<string, AccountSession>();

/**
 * The live session for a stored account, created once per app run, or
 * again if its home PDS turns out to have changed since the app started
 * with the one saved last time.
 */
export function accountSession(stored: StoredAccount, home: DiscoveredPds) {
  const existing = sessions.get(stored.storagePrefix);
  if (existing?.home === home) return existing;
  if (existing !== undefined) {
    existing.pds.disconnect(queryClient);
    void existing.transport.close();
  }
  const session = createAccountSession(stored, home);
  sessions.set(stored.storagePrefix, session);
  return session;
}

/** The live session of a signed-in address, if there is one. */
export function liveSession(address: string) {
  return [...sessions.values()].find((session) => session.address === address);
}

/** Forgets an account on this device and drops its cached data. */
export function closeAccountSession(session: AccountSession) {
  removeStoredAccount(session.address);
  sessions.delete(session.storagePrefix);
  session.pds.disconnect(queryClient);
  void session.transport.close();
  queryClient.removeQueries({ queryKey: pdsSessionQueryKey(session.address) });
  void forgetAccountNotifications(
    session.address,
    storedAccounts().length,
  ).catch(() => null);
}

/**
 * Removes the account if its home PDS says the session is gone, such as
 * after signing out elsewhere. Network failures keep it.
 */
export async function verifyAccountSession(session: AccountSession) {
  const { data, error } = await session.authSession();
  if (error === null && data === null) closeAccountSession(session);
  return data !== null;
}
