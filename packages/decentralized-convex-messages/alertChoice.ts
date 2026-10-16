import type { AlertLevel } from "./protocol.ts";

/**
 * The choice of alerts on a member row: `alerts`, or `none` on a muted
 * row from before alert levels.
 */
export function chosenAlerts(
  row: { alerts?: AlertLevel; muted?: boolean } | null,
): AlertLevel | undefined {
  if (row === null) return undefined;
  return row.alerts ?? (row.muted === true ? "none" : undefined);
}
