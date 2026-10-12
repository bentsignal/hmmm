import type { SpacesSort } from "~/features/preferences/store";

interface Sortable {
  readonly joinedAt?: number;
  readonly name: string;
}

function byName(left: Sortable, right: Sortable) {
  return left.name.localeCompare(right.name);
}

/**
 * Spaces across every account in one list: by name, or by when you joined
 * them, newest or oldest first. A space from an older PDS has no join time
 * and counts as the oldest; ties go by name.
 */
export function sortSpaces<Space extends Sortable>(
  spaces: readonly Space[],
  sort: SpacesSort,
) {
  if (sort === "name") return [...spaces].sort(byName);
  const sign = sort === "newest" ? -1 : 1;
  return [...spaces].sort(
    (left, right) =>
      sign * ((left.joinedAt ?? 0) - (right.joinedAt ?? 0)) ||
      byName(left, right),
  );
}
