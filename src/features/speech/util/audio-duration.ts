import { parseBuffer } from "music-metadata";

/**
 * Extract audio duration from buffer
 * @param buffer Audio file buffer
 * @returns Duration in seconds, or null if cannot be determined
 */
export async function getAudioDurationFromBuffer(buffer: Buffer) {
  const metadata = await parseBuffer(buffer);
  const duration = metadata.format.duration;
  if (!duration) {
    throw new Error("Duration not found in audio metadata");
  }
  return duration;
}
