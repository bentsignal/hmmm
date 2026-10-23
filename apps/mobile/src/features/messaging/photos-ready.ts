import { Image } from "expo-image";
// eslint-disable-next-line no-restricted-imports -- Conditional: it waits until the names are in, and there's no route loader to preload photos from.
import { useQuery } from "@tanstack/react-query";

/**
 * The longest a screen waits for the photos it shows before it fades in
 * anyway; the ones still loading then fade in from nothing on their own.
 */
const PHOTO_WAIT_MS = 1000;

/**
 * Whether `urls` are in memory, so the faces on a screen show with it as
 * it fades in rather than after it (see `Avatar`): loaded ahead, waiting
 * at most `PHOTO_WAIT_MS`. True at once with none to load.
 */
export function usePhotosReady(urls: readonly string[], enabled: boolean) {
  const unique = [...new Set(urls)].sort();
  const { isSuccess } = useQuery({
    enabled: enabled && unique.length > 0,
    gcTime: 10 * 60 * 1000,
    queryFn: () =>
      Promise.race([
        Image.prefetch(unique, "memory-disk").catch(() => false),
        new Promise<boolean>((resolve) => {
          setTimeout(() => resolve(false), PHOTO_WAIT_MS);
        }),
      ]),
    queryKey: ["photos-ready", unique],
    retry: false,
    // Only whether it's done matters, not whether every photo loaded.
    select: () => true,
    staleTime: Number.POSITIVE_INFINITY,
  });
  return unique.length === 0 || isSuccess;
}
