import type {
  Conversation,
  Message as PdsMessage,
} from "@decentralized-convex/messages";
import type { QueryClient, QueryKey } from "@tanstack/react-query";
import { AppState } from "react-native";
import { pdsQuery, pdsQueryKey } from "@decentralized-convex/tanstack-query";
import { pds } from "@vera/backend/pds";

import type { Saved, SavedEntry } from "./saved-files";
import { inboxQuery, rowProfiles } from "~/features/messaging/inbox";
import {
  latestOpenedAt,
  latestPageQueries,
} from "~/features/messaging/message-window";
import { chunks, reactionsQuery } from "~/features/messaging/reactions";
import { pdsResult, pdsResultOr } from "~/features/messaging/results";
import { summariesQuery } from "~/features/messaging/threads";
import {
  onAccountSession,
  queryClient,
} from "~/features/session/account-session";
import { fieldOf } from "./fields";
import { liveResult } from "./saved-cache";
import {
  conversationFile,
  deleteSaved,
  inboxFile,
  savedConversationIds,
  writeSaved,
} from "./saved-files";

/** How many of an account's most recent conversations it keeps. */
export const SAVED_CONVERSATIONS = 20;
/** How long after a change the account saves, at most once in that time. */
const SAVE_DELAY_MS = 5000;

interface Account {
  readonly address: string;
  readonly storagePrefix: string;
}

/** A conversation, as its screen asks for it (`useConversation`). */
function conversationQuery(session: string, conversationId: string) {
  return pdsQuery({
    args: { conversationId },
    options: { select: (result) => pdsResult(result)?.[0] },
    query: pds.messages.conversation,
    session,
  });
}

/** A group's joins and leaves, as its screen asks (`useMemberNotices`). */
function memberEventsQuery(session: string, conversationId: string) {
  return pdsQuery({
    args: { conversationId },
    options: { select: (result) => pdsResultOr(result, []) },
    query: pds.messages.memberEvents,
    session,
  });
}

function entryOf(queryClient: QueryClient, key: QueryKey) {
  const live = liveResult(
    queryClient.getQueryCache().find({ exact: true, queryKey: key }),
  );
  return live === undefined
    ? undefined
    : ({ key, result: live.result } satisfies SavedEntry);
}

/** A query's live result as its screen reads it (its `select`). */
function liveSelected<Data, Selected>(
  queryClient: QueryClient,
  options: { queryKey: QueryKey; select?: (data: Data) => Selected },
) {
  const query = queryClient
    .getQueryCache()
    .find<Data>({ exact: true, queryKey: options.queryKey });
  if (liveResult(query) === undefined || query?.state.data === undefined) {
    return undefined;
  }
  return options.select?.(query.state.data);
}

/** Whose profile a query asks for, if it asks for one. */
function profileOf(key: QueryKey) {
  const request = key[5];
  const operation = fieldOf(request, "operation");
  if (
    fieldOf(request, "plugin") !== "accounts" ||
    fieldOf(operation, "type") !== "getProfile"
  ) {
    return undefined;
  }
  const accountId = fieldOf(fieldOf(operation, "args"), "accountId");
  return typeof accountId === "string" ? accountId : undefined;
}

/** Every live profile in the cache, by address, under any account. */
function liveProfiles(queryClient: QueryClient) {
  const profiles = new Map<string, SavedEntry>();
  for (const { queryKey } of queryClient.getQueryCache().getAll()) {
    const accountId = profileOf(queryKey);
    const entry =
      accountId === undefined ? undefined : entryOf(queryClient, queryKey);
    if (accountId !== undefined && entry !== undefined) {
      profiles.set(accountId, entry);
    }
  }
  return profiles;
}

/** Each entry, or undefined if any is missing. */
function complete<Entry>(entries: readonly (Entry | undefined)[]) {
  const found = entries.filter((entry) => entry !== undefined);
  return found.length === entries.length ? found : undefined;
}

function lastActivity(conversation: Conversation) {
  return conversation.lastMessage?.sentAt ?? conversation.updatedAt;
}

/**
 * The Inbox and Spaces as Home shows them, and the account's most recent
 * conversations, or undefined until the Inbox and its rows' names are live.
 */
function inboxSaved(
  queryClient: QueryClient,
  address: string,
  profiles: ReadonlyMap<string, SavedEntry>,
) {
  const inbox = inboxQuery(address);
  const conversations = liveSelected(queryClient, inbox);
  if (conversations === undefined) return undefined;
  const people = new Set(
    conversations.flatMap((conversation) => rowProfiles(address, conversation)),
  );
  const rows = complete([...people].map((person) => profiles.get(person)));
  const main = entryOf(queryClient, inbox.queryKey);
  if (rows === undefined || main === undefined) return undefined;
  // Home's other lists, when they've loaded.
  const extras = [
    pdsQueryKey(pds.messages.spaces({}), address),
    pdsQueryKey(pds.messages.inboxThreads({}), address),
  ].flatMap((key) => entryOf(queryClient, key) ?? []);
  return {
    recent: [...conversations]
      .sort((left, right) => lastActivity(right) - lastActivity(left))
      .slice(0, SAVED_CONVERSATIONS)
      .map(({ conversationId }) => conversationId),
    saved: {
      entries: [main, ...extras, ...rows],
      savedAt: Date.now(),
    } satisfies Saved,
  };
}

/**
 * The queries the latest messages' pages show with: their reactions and
 * threads, a group's joins and leaves, and who they show.
 */
function pageParts(
  queryClient: QueryClient,
  address: string,
  conversation: Conversation,
  pages: readonly { messages: readonly PdsMessage[] }[],
) {
  const { conversationId, kind, members } = conversation;
  const reactions = pages.flatMap(({ messages }) =>
    chunks(messages.map(({ messageId }) => messageId)).map(
      (ids) => reactionsQuery(address, conversationId, ids).queryKey,
    ),
  );
  const summaries = pages.flatMap(({ messages }) =>
    chunks([
      ...new Set(
        messages.map(({ messageId, threadId }) => threadId ?? messageId),
      ),
    ]).map((ids) => summariesQuery(address, conversationId, ids)),
  );
  const repliers = summaries.flatMap((query) =>
    (liveSelected(queryClient, query) ?? []).flatMap(
      ({ repliers }) => repliers,
    ),
  );
  const events = memberEventsQuery(address, conversationId);
  const keys = [
    ...reactions,
    ...summaries.map(({ queryKey }) => queryKey),
    ...(kind === "group" ? [events.queryKey] : []),
  ];
  const people = [
    ...(kind === "channel" ? [] : members),
    ...pages.flatMap(({ messages }) =>
      messages.flatMap(({ authorId, quote }) => [
        authorId,
        ...(quote === undefined ? [] : [quote.authorId]),
      ]),
    ),
    ...repliers,
    ...(kind === "group"
      ? (liveSelected(queryClient, events) ?? []).map(
          ({ accountId }) => accountId,
        )
      : []),
  ];
  return { keys, people: new Set(people) };
}

/**
 * A conversation as it opens at its latest messages, from the window a
 * screen last showed it in this app session, or undefined unless every
 * part of it is live.
 */
function conversationSaved(
  queryClient: QueryClient,
  address: string,
  conversationId: string,
  profiles: ReadonlyMap<string, SavedEntry>,
) {
  const openedAt = latestOpenedAt(address, conversationId);
  if (openedAt === undefined) return undefined;
  const found = conversationQuery(address, conversationId);
  const conversation = liveSelected(queryClient, found);
  const pageQueries = latestPageQueries(address, conversationId, openedAt);
  const pages = complete(
    pageQueries.map((query) => liveSelected(queryClient, query)),
  );
  if (conversation == null || pages === undefined) return undefined;
  const parts = pageParts(queryClient, address, conversation, pages);
  const entries = complete(
    [
      found.queryKey,
      ...pageQueries.map(({ queryKey }) => queryKey),
      ...parts.keys,
    ].map((key) => entryOf(queryClient, key)),
  );
  const people = complete(
    [...parts.people].map((person) => profiles.get(person)),
  );
  if (entries === undefined || people === undefined) return undefined;
  // A channel's other members, for its title and @mentions, if loaded.
  const others = conversation.members.flatMap((member) =>
    parts.people.has(member) ? [] : (profiles.get(member) ?? []),
  );
  return {
    entries: [...entries, ...people, ...others],
    openedAt,
    savedAt: Date.now(),
  } satisfies Saved;
}

/**
 * Saves what the account's Home shows and its most recent conversations
 * that are live, and deletes the conversations no longer among them.
 */
function save(queryClient: QueryClient, { address, storagePrefix }: Account) {
  const profiles = liveProfiles(queryClient);
  const inbox = inboxSaved(queryClient, address, profiles);
  if (inbox === undefined) return;
  writeSaved(inboxFile(storagePrefix), inbox.saved);
  for (const conversationId of inbox.recent) {
    const saved = conversationSaved(
      queryClient,
      address,
      conversationId,
      profiles,
    );
    if (saved !== undefined) {
      writeSaved(conversationFile(storagePrefix, conversationId), saved);
    }
  }
  const recent = new Set(inbox.recent);
  for (const conversationId of savedConversationIds(storagePrefix)) {
    if (!recent.has(conversationId)) {
      deleteSaved(conversationFile(storagePrefix, conversationId));
    }
  }
}

/**
 * Keeps an account's Home and recent conversations saved on the device as
 * their live results change, a few seconds after each change and as the
 * app goes to the background. Returns a function that stops.
 */
function startSaving(queryClient: QueryClient, account: Account) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  function saveNow() {
    if (timer !== undefined) clearTimeout(timer);
    timer = undefined;
    save(queryClient, account);
  }
  const unsubscribe = queryClient.getQueryCache().subscribe((event) => {
    if (
      timer !== undefined ||
      event.type !== "updated" ||
      event.action.type !== "success"
    ) {
      return;
    }
    timer = setTimeout(saveNow, SAVE_DELAY_MS);
  });
  const appState = AppState.addEventListener("change", (state) => {
    if (state === "background" && timer !== undefined) saveNow();
  });
  return () => {
    unsubscribe();
    appState.remove();
    if (timer !== undefined) clearTimeout(timer);
  };
}

/** Saves every account session's screens while it lasts. */
export function installSaving() {
  onAccountSession((account) => startSaving(queryClient, account));
}
