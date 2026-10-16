import { File, Paths } from "expo-file-system";

/**
 * Unsent messages, one per conversation and account, kept on this device
 * only (never synced), so leaving a conversation and coming back finds the
 * message as it was left.
 */
const FILE_NAME = "message-drafts.json";
/** How long typing pauses before the drafts are written to disk. */
const SAVE_DELAY_MS = 400;

let drafts: Map<string, string> | undefined;
let saveTimer: ReturnType<typeof setTimeout> | undefined;

function file() {
  return new File(Paths.document, FILE_NAME);
}

function fromStored(stored: unknown) {
  const loaded = new Map<string, string>();
  if (typeof stored !== "object" || stored === null) return loaded;
  for (const [key, value] of Object.entries(stored)) {
    if (typeof value === "string") loaded.set(key, value);
  }
  return loaded;
}

function load() {
  if (drafts !== undefined) return drafts;
  try {
    drafts = file().exists
      ? fromStored(JSON.parse(file().textSync()))
      : new Map<string, string>();
  } catch {
    // An unreadable file loses the drafts, not the conversation.
    drafts = new Map<string, string>();
  }
  return drafts;
}

function save() {
  saveTimer = undefined;
  try {
    file().write(JSON.stringify(Object.fromEntries(load())));
  } catch {
    // The draft stays in memory for this session.
  }
}

export function draftKey(account: string, conversationId: string) {
  return `${account}:${conversationId}`;
}

export function readDraft(key: string) {
  return load().get(key) ?? "";
}

/** Saves the field's text; empty text drops the draft. */
export function writeDraft(key: string, text: string) {
  const all = load();
  if ((all.get(key) ?? "") === text) return;
  if (text === "") all.delete(key);
  else all.set(key, text);
  if (saveTimer !== undefined) clearTimeout(saveTimer);
  saveTimer = setTimeout(save, SAVE_DELAY_MS);
}
