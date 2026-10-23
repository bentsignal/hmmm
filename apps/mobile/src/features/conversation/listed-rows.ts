// When rows came into the list (see `Arrive`).

/**
 * When each row was first in the list's rows (see `noteRows`). A row that
 * came in while the list was scrolled away from it isn't mounted then, and
 * mounts when you scroll back to it: long after, so it shows as it is.
 */
const listedAt = new Map<string, number>();
/** A row mounting this soon after it's listed is one you watched come in. */
const WATCHED_MS = 2000;

/** Notes when each of the list's rows was first in it (see `Arrive`). */
export function noteRows(rows: readonly { key: string }[]) {
  const now = Date.now();
  for (const row of rows) {
    if (!listedAt.has(row.key)) listedAt.set(row.key, now);
  }
}

/** Whether the row `key` came in just now, rather than while away. */
export function justListed(key: string) {
  return Date.now() - (listedAt.get(key) ?? 0) < WATCHED_MS;
}
