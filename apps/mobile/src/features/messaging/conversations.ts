import type {
  Conversation,
  LinkCard,
  Message as PdsMessage,
} from "@decentralized-convex/messages";
import { useEffect, useRef, useState } from "react";
// eslint-disable-next-line no-restricted-imports -- Expo Router has no route loaders to preload suspense queries.
import { useMutation, useQuery } from "@tanstack/react-query";
import { listNames } from "@decentralized-convex/messages";
import { pdsMutation, pdsQuery } from "@decentralized-convex/tanstack-query";
import { pds } from "@vera/backend/pds";

import type { StagedFile } from "./attachments";
import type { OutgoingItem, OutgoingMessage } from "./outbox";
import type { ReactionSummary } from "./reactions";
import type { Message, MessageAttachment } from "~/features/conversation/types";
import { useAccount } from "./account";
import { useMessageWindow } from "./message-window";
import * as optimistic from "./optimistic";
import { sendOutgoing, useOutbox, withPrefetched } from "./outbox";
import { useProfileState } from "./profiles";
import { useReactions } from "./reactions";
import { pdsResult } from "./results";

export function toMessage(
  message: PdsMessage,
  reactions: readonly ReactionSummary[] | undefined,
  attachments: readonly MessageAttachment[] = message.attachments,
) {
  return {
    attachments,
    authorId: message.authorId,
    body: message.body.length > 0 ? message.body : undefined,
    id: message.messageId,
    linkPreview: message.linkPreview ?? undefined,
    linkPreviews: message.linkPreviews,
    reactions,
    sentAt: new Date(message.sentAt),
  } satisfies Message;
}

/**
 * A group's title: its name, or else the other members' names, in address
 * order like the PDS lists them (so it reads the same everywhere).
 */
export function groupTitle(
  name: string | null,
  members: readonly string[],
  self: string,
  displayName: (id: string) => string,
) {
  if (name !== null) return name;
  const others = members.filter((member) => member !== self).sort();
  return others.length === 0 ? "Group" : listNames(others.map(displayName));
}

export function conversationTitle(
  conversation: Pick<Conversation, "kind" | "members" | "name">,
  self: string,
  displayName: (id: string) => string,
) {
  const { kind, members, name } = conversation;
  if (kind === "channel") return `#${name ?? ""}`;
  if (kind === "group") return groupTitle(name, members, self, displayName);
  const other = members.find((member) => member !== self);
  return displayName(other ?? self);
}

export function useConversation(conversationId: string) {
  const { address } = useAccount();
  const { data } = useQuery(
    pdsQuery({
      args: { conversationId },
      options: { select: (result) => pdsResult(result)?.[0] },
      query: pds.messages.conversation,
      session: address,
    }),
  );
  const profiles = useProfileState(data?.members ?? []);
  const { profileOf } = profiles;
  function displayName(account: string) {
    return profileOf(account).displayName;
  }
  // An unnamed group's title is its members' names: wait for them, rather
  // than show usernames that then change.
  const titled = data != null && !(data.kind === "group" && data.name === null);
  return {
    conversation: data ?? undefined,
    displayName,
    isLoading: data === undefined,
    /** Every member's profile is known, so names and photos won't change. */
    profilesLoaded: data != null && !profiles.isLoading,
    profileOf,
    title:
      data != null && (titled || !profiles.isLoading)
        ? conversationTitle(data, address, displayName)
        : "",
  };
}

/**
 * Starting a group or a direct conversation as the scoped account. Both
 * show up (and open) right away, before the PDS answers.
 */
export function useConversationActions() {
  const { address: session } = useAccount();
  return {
    createGroup: useMutation(
      pdsMutation({
        mutation: pds.messages.createGroup,
        optimisticUpdate: optimistic.createGroup(session),
        session,
      }),
    ),
    openDirect: useMutation(
      pdsMutation({
        mutation: pds.messages.openDirect,
        optimisticUpdate: optimistic.openDirect(session),
        session,
      }),
    ),
  };
}

/** An attachment still uploading, shown from this device's copy. */
function localAttachment(messageId: string, item: OutgoingItem) {
  const { file } = item;
  return {
    ...item.attachment,
    durationMs: file.durationMs,
    height: file.height,
    kind: file.kind,
    localThumbnailUrl: file.poster?.uri,
    localUrl: file.uri,
    mimeType: file.mimeType,
    name: file.name,
    size: file.size,
    thumbnailUrl: item.attachment?.thumbnailUrl ?? file.poster?.uri,
    upload: { itemId: item.id, messageId, state: item.state },
    url: item.attachment?.url ?? file.uri,
    width: file.width,
  } satisfies MessageAttachment;
}

/**
 * A confirmed message's attachments, still drawn from this device's
 * copies when it sent them, so nothing reloads when the PDS confirms it.
 */
function withLocalMedia(
  message: PdsMessage,
  sent: OutgoingMessage | undefined,
) {
  if (sent === undefined) return message.attachments;
  return message.attachments.map((attachment) => {
    const item = sent.items.find(
      ({ attachment: uploaded }) => uploaded?.url === attachment.url,
    );
    return item === undefined
      ? attachment
      : {
          ...attachment,
          localThumbnailUrl: item.file.poster?.uri,
          localUrl: item.file.uri,
        };
  });
}

function unconfirmedMessage(
  message: OutgoingMessage,
  address: string,
  conversationId: string,
) {
  return {
    ...toMessage(
      {
        attachments: [],
        authorId: address,
        authorName: "",
        body: message.body,
        conversationId,
        linkPreview: null,
        linkPreviews: message.linkPreviews,
        messageId: message.messageId,
        sentAt: message.sentAt,
      },
      [],
      message.items.map((item) => localAttachment(message.messageId, item)),
    ),
    // One the PDS took shows as sent, even before the conversation's
    // pages list it.
    status: unconfirmedStatus(message.status),
  };
}

/**
 * Each message as the conversation shows it, kept from render to render
 * while what it's made from is the same, so its row doesn't redraw when
 * something else in the conversation changes.
 */
const shown = new WeakMap<
  PdsMessage | OutgoingMessage,
  {
    readonly message: Message;
    readonly reactions?: readonly ReactionSummary[];
    readonly sent?: OutgoingMessage;
  }
>();

function shownMessage(
  message: PdsMessage,
  sent: OutgoingMessage | undefined,
  reactions: readonly ReactionSummary[] | undefined,
) {
  const cached = shown.get(message);
  if (
    cached !== undefined &&
    cached.reactions === reactions &&
    cached.sent === sent
  ) {
    return cached.message;
  }
  const result = toMessage(
    withPrefetched(message, sent),
    reactions,
    withLocalMedia(message, sent),
  );
  shown.set(message, { message: result, reactions, sent });
  return result;
}

function shownUnconfirmed(
  message: OutgoingMessage,
  address: string,
  conversationId: string,
) {
  const cached = shown.get(message);
  if (cached !== undefined) return cached.message;
  const result = unconfirmedMessage(message, address, conversationId);
  shown.set(message, { message: result });
  return result;
}

function unconfirmedStatus(status: OutgoingMessage["status"]) {
  if (status === "sent") return undefined;
  return status;
}

/**
 * The pages whose messages show: each once it and its messages' reactions
 * have loaded, so a page never appears and then grows under its reactions.
 * Once shown, a page stays, even while its reactions reload.
 */
function useSettledPages(
  pages: ReturnType<typeof useMessageWindow>["pages"],
  reactionsOf: (messageId: string) => unknown,
) {
  const [settled, setSettled] = useState<ReadonlySet<string>>(new Set());
  const ready = pages.filter(
    (page) =>
      page.messageIds?.every((id) => reactionsOf(id) !== undefined) === true,
  );
  const newlyReady = ready.filter((page) => !settled.has(page.key));
  if (newlyReady.length > 0) {
    setSettled(new Set([...settled, ...newlyReady.map((page) => page.key)]));
  }
  const readyKeys = new Set(ready.map((page) => page.key));
  const shown = pages.filter(
    (page) => settled.has(page.key) || readyKeys.has(page.key),
  );
  const shownKeys = new Set(shown.map((page) => page.key));
  return {
    /** The window's opening pages haven't all loaded yet. */
    isLoading: pages.some((page) => page.initial && !shownKeys.has(page.key)),
    shownIds: new Set(shown.flatMap((page) => page.messageIds ?? [])),
  };
}

/**
 * Messages oldest first, opened at the latest message or around `anchor`,
 * with this device's unconfirmed sends at the end.
 */
export function useMessages(conversationId: string, anchor?: string) {
  const { address, session } = useAccount();
  const view = useMessageWindow(address, conversationId, anchor);
  const { reactionsOf, toggle } = useReactions(
    address,
    conversationId,
    view.pageMessageIds,
  );
  const settled = useSettledPages(view.pages, reactionsOf);
  const outbox = useOutbox(address, conversationId);
  const sentById = new Map(outbox.map((item) => [item.messageId, item]));
  const confirmed = new Set(view.messages.map((message) => message.messageId));
  const atLatest = !view.hasNewer;
  const unconfirmed = atLatest
    ? outbox
        .filter((message) => !confirmed.has(message.messageId))
        .map((message) => shownUnconfirmed(message, address, conversationId))
    : [];

  return {
    ...view,
    isLoading: settled.isLoading,
    messages: [
      ...view.messages
        .filter((message) => settled.shownIds.has(message.messageId))
        .map((message) =>
          shownMessage(
            message,
            sentById.get(message.messageId),
            reactionsOf(message.messageId),
          ),
        ),
      ...unconfirmed,
    ],
    /** Adds or removes your reaction, showing it right away. */
    toggleReaction: toggle,
    /** Only set when the newest loaded message is the newest there is. */
    newestSentAt: atLatest ? view.messages.at(-1)?.sentAt : undefined,
    /**
     * Sends a message, shown right away; its files upload after that.
     * `linkPreviews` are the cards it starts with (see `useLinkPrefetch`).
     */
    sendMessage: (
      body: string,
      files: readonly StagedFile[] = [],
      linkPreviews: readonly LinkCard[] = [],
    ) => {
      if (!atLatest) view.jumpToLatest();
      sendOutgoing({ body, conversationId, files, linkPreviews, session });
    },
  };
}

/** Marks the conversation read up to the newest message while it is open. */
export function useMarkRead(conversationId: string, newestSentAt?: number) {
  const { address } = useAccount();
  const { mutate } = useMutation(
    pdsMutation({ mutation: pds.messages.markRead, session: address }),
  );
  const lastMarked = useRef(0);
  // eslint-disable-next-line no-restricted-syntax -- Read state lives on the server and must follow messages arriving while the screen is open.
  useEffect(() => {
    if (newestSentAt === undefined || newestSentAt <= lastMarked.current) {
      return;
    }
    lastMarked.current = newestSentAt;
    mutate({ conversationId, readAt: newestSentAt });
  }, [conversationId, mutate, newestSentAt]);
}
