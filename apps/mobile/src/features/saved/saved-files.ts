import { Directory, File, Paths } from "expo-file-system";
import { pds } from "@vera/backend/pds";

import { fieldOf } from "./fields";

/** One query's result as saved, under the key the app asks for it by. */
export interface SavedEntry {
  readonly key: readonly unknown[];
  readonly result: unknown;
}

/** What one screen shows, saved on the device the last time it was live. */
export interface Saved {
  readonly entries: readonly SavedEntry[];
  /**
   * For a conversation: when the window its pages came from opened, which
   * the pages' cursors are keyed by (see `openAt` in `message-window`).
   */
  readonly openedAt?: number;
  readonly savedAt: number;
}

const FORMAT = 1;

/**
 * The plugins' versions the results were saved under. After an update that
 * changes them, the app asks for its queries by other keys, and results it
 * saved before might no longer read as it expects, so they're ignored.
 */
const STAMP = [
  pds.messages.inbox({ channels: true }),
  pds.accounts.getProfile({ accountId: "" }),
]
  .map(
    ({ lastChanged, plugin, version }) => `${plugin}@${version}/${lastChanged}`,
  )
  .join(" ");

/**
 * Each account's saved screens, in the cache folder: the system may clear
 * it when the device runs low on space, and it isn't backed up.
 */
function folder(storagePrefix: string) {
  return new Directory(Paths.cache, "saved", storagePrefix);
}

const CONVERSATION_PREFIX = "c-";

export function inboxFile(storagePrefix: string) {
  return new File(folder(storagePrefix), "inbox.json");
}

export function conversationFile(
  storagePrefix: string,
  conversationId: string,
) {
  return new File(
    folder(storagePrefix),
    `${CONVERSATION_PREFIX}${encodeURIComponent(conversationId)}.json`,
  );
}

function entryFrom(stored: unknown) {
  const key = fieldOf(stored, "key");
  if (!Array.isArray(key) || fieldOf(stored, "result") === undefined) {
    return [];
  }
  return [{ key, result: fieldOf(stored, "result") } satisfies SavedEntry];
}

function savedFrom(stored: unknown) {
  if (
    fieldOf(stored, "format") !== FORMAT ||
    fieldOf(stored, "stamp") !== STAMP
  ) {
    return undefined;
  }
  const entries = fieldOf(stored, "entries");
  const openedAt = fieldOf(stored, "openedAt");
  const savedAt = fieldOf(stored, "savedAt");
  if (!Array.isArray(entries) || typeof savedAt !== "number") return undefined;
  return {
    entries: entries.flatMap(entryFrom),
    ...(typeof openedAt === "number" && { openedAt }),
    savedAt,
  } satisfies Saved;
}

export function readSaved(file: File) {
  try {
    return file.exists ? savedFrom(JSON.parse(file.textSync())) : undefined;
  } catch {
    // Unreadable, it's as if nothing was saved.
    return undefined;
  }
}

/** What each file last had written, to skip writing it again unchanged. */
const written = new Map<string, string>();

/** Writes a screen's data, unless the file already has it. */
export function writeSaved(file: File, saved: Saved) {
  // The time it was saved changes every time, so it's left out of the check.
  const content = JSON.stringify({ ...saved, savedAt: 0 });
  if (written.get(file.uri) === content) return;
  try {
    file.parentDirectory.create({ idempotent: true, intermediates: true });
    file.write(JSON.stringify({ ...saved, format: FORMAT, stamp: STAMP }));
    written.set(file.uri, content);
  } catch {
    // Saved again with the next change.
  }
}

/** The conversations an account has saved, by ID. */
export function savedConversationIds(storagePrefix: string) {
  try {
    const saved = folder(storagePrefix);
    if (!saved.exists) return [];
    return saved
      .list()
      .flatMap(({ name }) =>
        name.startsWith(CONVERSATION_PREFIX) && name.endsWith(".json")
          ? [
              decodeURIComponent(
                name.slice(CONVERSATION_PREFIX.length, -".json".length),
              ),
            ]
          : [],
      );
  } catch {
    return [];
  }
}

export function deleteSaved(file: File) {
  try {
    if (file.exists) file.delete();
    written.delete(file.uri);
  } catch {
    // Tried again the next time the account saves.
  }
}

/** Deletes everything an account saved, as it signs out. */
export function forgetSaved(storagePrefix: string) {
  try {
    const saved = folder(storagePrefix);
    if (saved.exists) saved.delete();
  } catch {
    // Left for the system to clear with the rest of the cache.
  }
  for (const uri of written.keys()) {
    if (uri.startsWith(folder(storagePrefix).uri)) written.delete(uri);
  }
}
