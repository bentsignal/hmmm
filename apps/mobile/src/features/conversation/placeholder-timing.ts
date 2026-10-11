// When a link card shows its loading placeholder, like TanStack Router's
// pendingMs and pendingMinMs. Most previews arrive in well under a second,
// and a placeholder that appears only to be replaced a moment later reads as
// a flicker however smoothly it fades. So a card waits a beat before showing
// one, and once one is up it stays long enough to read as deliberate.

/**
 * How long a card without its preview keeps its space empty before the
 * placeholder fades in. A preview that arrives sooner fades straight in,
 * and the placeholder never shows.
 */
export const PENDING_MS = 150;

/**
 * How long a placeholder, once it starts fading in, stays before the card
 * (or the plain link, if there is no preview) replaces it.
 */
export const PENDING_MIN_MS = 500;

/**
 * Where a card is in its wait:
 * - `waiting`: inside `PENDING_MS`, space kept, nothing shown.
 * - `showing`: the placeholder is up, for less than `PENDING_MIN_MS`.
 * - `done`: the wait no longer holds anything back.
 */
export type PlaceholderStage = "done" | "showing" | "waiting";

/** What a card draws. */
export type CardFace = "card" | "placeholder" | "space";

/** A card that already has its preview when it appears never waits. */
export function initialStage(loaded: boolean) {
  return loaded ? ("done" as const) : ("waiting" as const);
}

/**
 * The stage a card draws, decided as it renders rather than when a timer
 * fires: when the JavaScript thread is busy (opening a conversation), the
 * pending timer and the preview often land in the same render, and the
 * preview wins, since no placeholder was ever on screen.
 */
export function resolveStage({
  stage,
  loaded,
  pendingDue,
}: {
  stage: PlaceholderStage;
  loaded: boolean;
  /** `PENDING_MS` has passed since the card appeared. */
  pendingDue: boolean;
}) {
  if (stage !== "waiting") return stage;
  if (loaded) return "done" as const;
  return pendingDue ? ("showing" as const) : stage;
}

/** The placeholder has been on screen for `PENDING_MIN_MS`. */
export function minElapsed(stage: PlaceholderStage) {
  return stage === "showing" ? ("done" as const) : stage;
}

export function cardFace(loaded: boolean, stage: PlaceholderStage) {
  if (stage === "showing") return "placeholder" as const;
  if (loaded) return "card" as const;
  return stage === "waiting" ? ("space" as const) : ("placeholder" as const);
}

/** Calls `due` once `PENDING_MS` passes; start it when the card appears. */
export function startPendingClock(due: () => void) {
  setTimeout(due, PENDING_MS);
}

/**
 * Calls `due` once `PENDING_MIN_MS` passes; start it when the placeholder
 * is first laid out, so a placeholder that showed late still stays its
 * full time.
 */
export function startMinClock(due: () => void) {
  setTimeout(due, PENDING_MIN_MS);
}
