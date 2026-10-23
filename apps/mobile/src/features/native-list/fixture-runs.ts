import type { Row } from "./contract";

/**
 * Marks runs: a message starts one when the message before it (older) is
 * someone else's or a header or notice sits between them, and ends one
 * when the message after it does.
 */
export function withRuns(rows: readonly Row[]) {
  return rows.map((row, index) => {
    if (row.kind !== "message") return row;
    const newer = rows[index - 1];
    const older = rows[index + 1];
    const startsGroup =
      older?.kind !== "message" || older.author.id !== row.author.id;
    const endsGroup =
      newer?.kind !== "message" || newer.author.id !== row.author.id;
    if (row.startsGroup === startsGroup && row.endsGroup === endsGroup) {
      return row;
    }
    return { ...row, endsGroup, startsGroup };
  });
}
