import { useSyncExternalStore } from "react";

// Upload progress changes many times a second, so it has its own store
// that only the progress ring reads, instead of re-rendering the list.

const progress = new Map<string, number>();
const progressListeners = new Map<string, Set<() => void>>();

export function setUploadProgress(itemId: string, fraction: number) {
  // Whole percents, so a fast upload doesn't redraw for every packet.
  const rounded = Math.round(fraction * 100) / 100;
  if (progress.get(itemId) === rounded) return;
  progress.set(itemId, rounded);
  for (const listener of progressListeners.get(itemId) ?? []) listener();
}

/** How much of an attachment has uploaded, from 0 to 1. */
export function useUploadProgress(itemId: string) {
  return useSyncExternalStore(
    (listener) => {
      const set = progressListeners.get(itemId) ?? new Set();
      set.add(listener);
      progressListeners.set(itemId, set);
      return () => set.delete(listener);
    },
    () => progress.get(itemId) ?? 0,
  );
}
