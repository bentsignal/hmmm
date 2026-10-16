// The kinds of rows the Inbox lists, chosen with checkboxes in its filter.

/** A kind of row the Inbox can list; it lists the kinds ticked. */
export type InboxKind = "channels" | "chats" | "threads";

/** Every kind, in the order the filter menu lists them. */
export const INBOX_KINDS = ["chats", "channels", "threads"] as const;

/** What the Inbox lists at first: every kind. */
export const DEFAULT_INBOX_KINDS = INBOX_KINDS;

/**
 * The kinds saved in stored preferences, or from the one choice
 * (`inboxFrom`) builds before threads saved: Chats or Channels stays
 * that, and Everything (the default then, as was a space filter from
 * even earlier) becomes every kind, threads too.
 */
export function storedInboxKinds(stored: object) {
  return (
    savedKinds(Reflect.get(stored, "inboxKinds")) ??
    kindsFromChoice(Reflect.get(stored, "inboxFrom"))
  );
}

/** The kinds in a saved list, or undefined when none was saved. */
function savedKinds(saved: unknown) {
  if (!Array.isArray(saved)) return undefined;
  return INBOX_KINDS.filter((kind) => saved.includes(kind));
}

function kindsFromChoice(from: unknown) {
  if (from === "chats" || from === "channels") {
    return INBOX_KINDS.filter((kind) => kind === from);
  }
  return [...DEFAULT_INBOX_KINDS];
}

/** The kinds with `kind` ticked or unticked, in `INBOX_KINDS` order. */
export function toggledInboxKind(kinds: readonly InboxKind[], kind: InboxKind) {
  return INBOX_KINDS.filter((item) =>
    item === kind ? !kinds.includes(item) : kinds.includes(item),
  );
}

/** Whether these are the kinds the Inbox lists at first. */
export function isDefaultInboxKinds(kinds: readonly InboxKind[]) {
  return (
    kinds.length === DEFAULT_INBOX_KINDS.length &&
    DEFAULT_INBOX_KINDS.every((kind) => kinds.includes(kind))
  );
}
