// What the PDS accepts as an attachment upload. The app imports these too
// (`@vera/backend/upload-limits`), so it can turn an item away when it's
// picked instead of failing after the person taps Send.

/** The largest upload for each kind of attachment, in bytes. */
export const MAX_UPLOAD_BYTES = {
  file: 100_000_000,
  image: 50_000_000,
  video: 500_000_000,
};

/**
 * The longest video the app lets you send. Only the app checks it, when a
 * video is picked; the PDS limits uploads by size alone.
 */
export const MAX_VIDEO_SECONDS = 60;

export type UploadKind = keyof typeof MAX_UPLOAD_BYTES;

/**
 * Whether the PDS takes an upload of `size` bytes. A size of 0 means the
 * app didn't know it: app versions before 2026-10 always sent 0 for a
 * video's poster frame, and turning those away made every video fail.
 */
export function uploadSizeAllowed(kind: UploadKind, size: number) {
  return Number.isFinite(size) && size >= 0 && size <= MAX_UPLOAD_BYTES[kind];
}
