/**
 * How long after the app opens a downloaded update may still restart it.
 * Opening already shows a brief splash, so a restart this soon reads as part
 * of opening. Later, people are likely in the middle of something, and the
 * update waits for the next open.
 */
export const OPEN_WINDOW_MS = 3_000;

export interface RestartState {
  /** When the app last launched or came back from the background. */
  readonly openedAt: number;
  readonly now: number;
  /** Whether the app is in the foreground. */
  readonly active: boolean;
  /** Messages that would be lost: still sending, or failed and kept to retry. */
  readonly unsentMessages: boolean;
  /** Changes still on their way to a server. */
  readonly pendingMutations: number;
}

/** Whether restarting into a downloaded update now goes unnoticed. */
export function canRestartForUpdate(state: RestartState) {
  return (
    state.active &&
    state.now - state.openedAt <= OPEN_WINDOW_MS &&
    !state.unsentMessages &&
    state.pendingMutations === 0
  );
}
