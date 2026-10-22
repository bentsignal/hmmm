import type { DiscoveredPds } from "@decentralized-convex/address";

import type {
  AnyPdsQueryRequest,
  DefaultCombinedPdsResult,
  PdsConnection,
  PdsRequestResult,
} from "./pds.ts";
import type {
  FederatedQuerySnapshot,
  FederationSourceSnapshot,
  FederationTarget,
  IncludedPdsQuery,
} from "./types.ts";
import { PdsInitialResponseTimeoutError, toError } from "./errors.ts";
import { includedOnHome } from "./included.ts";
import { PdsClient } from "./pds.ts";
import { createFederatedSnapshot } from "./snapshot.ts";
import { groupFederationTargets } from "./targets.ts";

/**
 * Where the PDSes a query's routes name stand while they can't be found
 * (see `#routesFailed`).
 */
const UNRESOLVED = "unresolved:";
/** The first wait before finding a query's PDSes again, doubling to the most. */
const ROUTE_RETRY_MS = 1000;
const ROUTE_RETRY_MAX_MS = 30_000;

export class RoutedPdsQueryObserver<
  Request extends AnyPdsQueryRequest,
  Combined = DefaultCombinedPdsResult<Request>,
> {
  readonly #getConnection;
  readonly #home;
  readonly #initialResponseTimeout;
  readonly #initialResponseTimers = new Map<
    string,
    ReturnType<typeof setTimeout>
  >();
  #included: readonly IncludedPdsQuery[] = [];
  readonly #listeners = new Set<() => void>();
  readonly #request;
  readonly #homeTarget;
  readonly #knownPds;
  readonly #revealPartialResultsAfter;
  readonly #resolveRoutes;
  readonly #sources = new Map<
    string,
    FederationSourceSnapshot<PdsRequestResult<Request>>
  >();
  readonly #unsubscribes = new Map<string, () => void>();
  #closed = false;
  #completedInitialLoad = false;
  #partialResultsTimer?: ReturnType<typeof setTimeout>;
  #routesResolved = false;
  #routingGeneration = 0;
  #routeFailures = 0;
  #routeRetry?: ReturnType<typeof setTimeout>;
  #snapshot: FederatedQuerySnapshot<Combined, PdsRequestResult<Request>>;
  readonly #startedAt = Date.now();

  constructor(options: {
    getConnection: (url: string) => PdsConnection;
    home: FederationTarget;
    initialResponseTimeout: number;
    request: Request;
    /** PDSs by domain, to tell which included results are complete. */
    knownPds?: ReadonlyMap<string, DiscoveredPds>;
    revealPartialResultsAfter: number;
    resolveRoutes: (
      routes: readonly string[],
    ) => Promise<readonly FederationTarget[]>;
  }) {
    this.#getConnection = options.getConnection;
    this.#home = groupFederationTargets([options.home])[0] ?? {
      ids: [options.home.id],
      url: options.home.url,
    };
    this.#initialResponseTimeout = options.initialResponseTimeout;
    this.#request = options.request;
    this.#homeTarget = options.home;
    this.#knownPds = options.knownPds ?? new Map<string, DiscoveredPds>();
    this.#revealPartialResultsAfter = options.revealPartialResultsAfter;
    this.#resolveRoutes = options.resolveRoutes;
    this.#sources.set(this.#home.url, {
      status: "pending",
      target: this.#home,
    });
    this.#snapshot = createFederatedSnapshot([...this.#sources.values()]);
    this.#startInitialResponseTimer(this.#home.url);
    this.#watchHome();
  }

  getSnapshot = () => this.#snapshot;

  subscribe = (listener: () => void) => {
    this.#listeners.add(listener);
    return () => this.#listeners.delete(listener);
  };

  close() {
    if (this.#closed) return;
    this.#closed = true;
    this.#routingGeneration += 1;
    clearTimeout(this.#routeRetry);
    if (this.#partialResultsTimer !== undefined) {
      clearTimeout(this.#partialResultsTimer);
    }
    for (const timer of this.#initialResponseTimers.values()) {
      clearTimeout(timer);
    }
    this.#initialResponseTimers.clear();
    for (const unsubscribe of this.#unsubscribes.values()) unsubscribe();
    this.#unsubscribes.clear();
    this.#listeners.clear();
  }

  #watchHome() {
    const client = new PdsClient({
      connection: this.#getConnection(this.#home.url),
    });
    const unsubscribe = client.watchQueryWithRouting(
      this.#request,
      ({ data, included, routes }) => {
        // Before the result itself, so a cache shows both at once.
        if (included.length > 0 || this.#included.length > 0) {
          this.#included = includedOnHome(
            included,
            this.#homeTarget,
            this.#knownPds,
          );
        }
        this.#update(this.#home.url, { data, status: "live" });
        void this.#reconcileRoutes(routes);
      },
      (error) => this.#update(this.#home.url, { error, status: "error" }),
    );
    this.#unsubscribes.set(this.#home.url, unsubscribe);
  }

  async #reconcileRoutes(routes: readonly string[]) {
    const generation = ++this.#routingGeneration;
    clearTimeout(this.#routeRetry);
    let resolved: readonly FederationTarget[];
    try {
      resolved = await this.#resolveRoutes(routes);
    } catch (error) {
      if (this.#closed || generation !== this.#routingGeneration) return;
      this.#routesFailed(routes, toError(error));
      return;
    }
    if (this.#closed || generation !== this.#routingGeneration) return;
    this.#routeFailures = 0;

    const targets = groupFederationTargets([
      { id: this.#home.ids[0] ?? this.#home.url, url: this.#home.url },
      ...resolved,
    ]);
    const removed = this.#removeStaleTargets(targets);
    const first = !this.#routesResolved;
    this.#routesResolved = true;
    const added = this.#addTargets(targets);
    // Every update from home brings its routes; only a change to them
    // changes what this shows. Publishing again otherwise would show the
    // same result twice for every update.
    if (first || removed || added) this.#publish();
  }

  /**
   * The PDSes the routes name couldn't all be found (one unreachable, or
   * too old for the request). Until they are, they count as one that
   * failed, so what the others have shows as a partial result instead of
   * the query waiting for good; finding them is tried again, waiting
   * longer each time, and again with every update from home.
   */
  #routesFailed(routes: readonly string[], error: Error) {
    this.#sources.set(UNRESOLVED, {
      error,
      status: "error",
      target: { ids: [...routes], url: UNRESOLVED },
    });
    this.#routesResolved = true;
    this.#publish();
    const delay = Math.min(
      ROUTE_RETRY_MAX_MS,
      ROUTE_RETRY_MS * 2 ** this.#routeFailures,
    );
    this.#routeFailures += 1;
    this.#routeRetry = setTimeout(
      () => void this.#reconcileRoutes(routes),
      delay,
    );
  }

  /** Stops asking PDSes no longer routed to; whether there were any. */
  #removeStaleTargets(targets: readonly { readonly url: string }[]) {
    const desiredUrls = new Set(targets.map(({ url }) => url));
    let removed = false;
    for (const url of this.#sources.keys()) {
      if (url === this.#home.url || desiredUrls.has(url)) continue;
      this.#unsubscribes.get(url)?.();
      this.#unsubscribes.delete(url);
      this.#clearInitialResponseTimer(url);
      this.#sources.delete(url);
      removed = true;
    }
    return removed;
  }

  #addTargets(
    targets: readonly {
      readonly ids: readonly string[];
      readonly url: string;
    }[],
  ) {
    const added = targets.filter(
      (target) =>
        target.url !== this.#home.url && !this.#sources.has(target.url),
    );
    for (const target of added) {
      this.#sources.set(target.url, { status: "pending", target });
      this.#startInitialResponseTimer(target.url);
    }
    for (const target of added) {
      const client = new PdsClient({
        connection: this.#getConnection(target.url),
      });
      this.#unsubscribes.set(
        target.url,
        client.watchQuery(
          this.#request,
          (data) => this.#update(target.url, { data, status: "live" }),
          (error) => this.#update(target.url, { error, status: "error" }),
        ),
      );
    }
    return added.length > 0;
  }

  #update(
    url: string,
    update:
      | { data: PdsRequestResult<Request>; status: "live" }
      | { error: Error; status: "error" },
  ) {
    if (this.#closed) return;
    const source = this.#sources.get(url);
    if (source === undefined) return;
    this.#clearInitialResponseTimer(url);
    this.#sources.set(
      url,
      update.status === "error" &&
        (source.status === "live" || source.status === "stale")
        ? {
            data: source.data,
            error: update.error,
            status: "stale",
            target: source.target,
          }
        : { ...update, target: source.target },
    );
    this.#publish();
  }

  #publish() {
    let snapshot: FederatedQuerySnapshot<
      Combined,
      PdsRequestResult<Request>
    > = {
      ...createFederatedSnapshot<PdsRequestResult<Request>, Combined>([
        ...this.#sources.values(),
      ]),
      included: this.#included,
    };

    if (!this.#routesResolved && snapshot.status !== "error") {
      snapshot = { ...snapshot, status: "pending" };
    }

    if (snapshot.status === "success") {
      this.#completedInitialLoad = true;
      this.#clearPartialResultsTimer();
    } else if (this.#completedInitialLoad) {
      snapshot = { ...snapshot, status: "success" };
    } else if (snapshot.status === "partial") {
      const remaining =
        this.#revealPartialResultsAfter - (Date.now() - this.#startedAt);
      if (remaining > 0) {
        this.#schedulePartialResults(remaining);
        return;
      }
    }

    this.#snapshot = snapshot;
    for (const listener of this.#listeners) listener();
  }

  #schedulePartialResults(delay: number) {
    if (this.#partialResultsTimer !== undefined) return;
    this.#partialResultsTimer = setTimeout(() => {
      this.#partialResultsTimer = undefined;
      this.#publish();
    }, delay);
  }

  #clearPartialResultsTimer() {
    if (this.#partialResultsTimer === undefined) return;
    clearTimeout(this.#partialResultsTimer);
    this.#partialResultsTimer = undefined;
  }

  #startInitialResponseTimer(url: string) {
    this.#initialResponseTimers.set(
      url,
      setTimeout(
        () =>
          this.#update(url, {
            error: new PdsInitialResponseTimeoutError(url),
            status: "error",
          }),
        this.#initialResponseTimeout,
      ),
    );
  }

  #clearInitialResponseTimer(url: string) {
    const timer = this.#initialResponseTimers.get(url);
    if (timer === undefined) return;
    clearTimeout(timer);
    this.#initialResponseTimers.delete(url);
  }
}
