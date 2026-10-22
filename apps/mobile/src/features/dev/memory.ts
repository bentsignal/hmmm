import { fieldOf } from "~/features/saved/fields";
import { queryClient } from "~/features/session/account-session";

// `veraDev.memory()` (dev builds only): what the JavaScript heap holds,
// and how much of it is the query cache, to tell what opening and closing
// conversations keeps around.

/** Hermes's collector, in debug builds and profile bundles. */
declare const gc: (() => void) | undefined;

declare const HermesInternal:
  | {
      getInstrumentedStats?: () => Record<string, number>;
    }
  | undefined;

/** Megabytes, to one decimal. */
function mb(bytes: number) {
  return Math.round(bytes / 1e5) / 10;
}

/** The JSON size of `data`, or 0 if it can't be serialized. */
function sizeOf(data: unknown) {
  try {
    return JSON.stringify(data).length;
  } catch {
    return 0;
  }
}

/** The cached queries, grouped by the function they call. */
function queriesByName() {
  const groups = new Map<
    string,
    { count: number; observed: number; bytes: number }
  >();
  for (const query of queryClient.getQueryCache().getAll()) {
    // A PDS query's request: its plugin and operation.
    const request = query.queryKey[5];
    const operation = fieldOf(fieldOf(request, "operation"), "type");
    const plugin = fieldOf(request, "plugin");
    const name =
      typeof plugin === "string" && typeof operation === "string"
        ? `${plugin}.${operation}`
        : "other";
    const group = groups.get(name) ?? { bytes: 0, count: 0, observed: 0 };
    group.count += 1;
    if (query.getObserversCount() > 0) group.observed += 1;
    group.bytes += sizeOf(query.state.data);
    groups.set(name, group);
  }
  return Object.fromEntries(
    [...groups.entries()]
      .sort((left, right) => right[1].bytes - left[1].bytes)
      .map(([name, group]) => [name, { ...group, mb: mb(group.bytes) }]),
  );
}

/** What memory.ts measures, now. */
export function memoryReport({ collect = false } = {}) {
  if (collect && typeof gc === "function") gc();
  const stats = HermesInternal?.getInstrumentedStats?.() ?? {};
  const queries = queryClient.getQueryCache().getAll();
  return {
    jsLiveMb: mb(stats.js_allocatedBytes ?? 0),
    jsHeapMb: mb(stats.js_heapSize ?? 0),
    queries: queries.length,
    observed: queries.filter((query) => query.getObserversCount() > 0).length,
    byName: queriesByName(),
  };
}
