import type {
  FederationAuthTokenFetcher,
  FederationConnection,
  FederationMutationReference,
  FederationQueryReference,
  PdsConnectionMutationOptions,
} from "@decentralized-convex/client";
import type { FunctionArgs, FunctionReturnType } from "convex/server";
import { useSyncExternalStore } from "react";
import * as SecureStore from "expo-secure-store";
import { createConvexFederationConnection } from "@decentralized-convex/client";

// Development only: holds back what the PDS answers, to try what the app
// shows on a slow connection or none (saved conversations and their glow)
// without turning off the network.

export const SERVER_DELAYS = ["off", "slow", "never"] as const;
export type ServerDelay = (typeof SERVER_DELAYS)[number];

/** How long a slow server takes to answer each new query. */
const SLOW_MS = 3000;
const STORAGE_KEY = "vera.dev.serverDelay";

let current: ServerDelay | undefined;
const listeners = new Set<() => void>();

export function serverDelay() {
  if (current === undefined) {
    const stored = SecureStore.getItem(STORAGE_KEY);
    current = SERVER_DELAYS.find((delay) => delay === stored) ?? "off";
  }
  return current;
}

/** Applies to queries started from now on, and to later launches. */
export function setServerDelay(delay: ServerDelay) {
  current = delay;
  SecureStore.setItem(STORAGE_KEY, delay);
  for (const listener of listeners) listener();
}

export function useServerDelay() {
  return useSyncExternalStore((onChange) => {
    listeners.add(onChange);
    return () => listeners.delete(onChange);
  }, serverDelay);
}

function holdMs() {
  const delay = serverDelay();
  if (delay === "off") return 0;
  return delay === "slow" ? SLOW_MS : Number.POSITIVE_INFINITY;
}

/**
 * The default connection, with every query's answers held back for the
 * delay set when it started. Mutations go through as usual.
 */
class DelayedConnection implements FederationConnection {
  readonly #connection;

  constructor(url: string, getAuthToken?: FederationAuthTokenFetcher) {
    this.#connection = createConvexFederationConnection(url, getAuthToken);
  }

  close() {
    return this.#connection.close();
  }

  mutation<Mutation extends FederationMutationReference>(
    mutation: Mutation,
    args: FunctionArgs<Mutation>,
    options?: PdsConnectionMutationOptions,
  ) {
    return this.#connection.mutation(mutation, args, options);
  }

  async query<Query extends FederationQueryReference>(
    query: Query,
    args: FunctionArgs<Query>,
  ) {
    const hold = holdMs();
    const result = await this.#connection.query(query, args);
    if (hold === Number.POSITIVE_INFINITY) {
      return new Promise<FunctionReturnType<Query>>(() => undefined);
    }
    await new Promise((resolve) => setTimeout(resolve, hold));
    return result;
  }

  subscribe<Query extends FederationQueryReference>(
    query: Query,
    args: FunctionArgs<Query>,
    onResult: (result: FunctionReturnType<Query>) => void,
    onError: (error: Error) => void,
  ) {
    const hold = holdMs();
    if (hold === 0) {
      return this.#connection.subscribe(query, args, onResult, onError);
    }
    const opensAt = Date.now() + hold;
    let held: { result: FunctionReturnType<Query> } | undefined;
    const timer = Number.isFinite(hold)
      ? setTimeout(() => {
          if (held !== undefined) onResult(held.result);
        }, hold)
      : undefined;
    const unsubscribe = this.#connection.subscribe(
      query,
      args,
      (result) => {
        if (Date.now() >= opensAt) onResult(result);
        else held = { result };
      },
      onError,
    );
    return () => {
      clearTimeout(timer);
      unsubscribe();
    };
  }
}

export function delayedConnection(
  url: string,
  getAuthToken?: FederationAuthTokenFetcher,
) {
  return new DelayedConnection(url, getAuthToken);
}
