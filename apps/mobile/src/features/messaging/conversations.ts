import type {
  Conversation,
  Message as PdsMessage,
} from "@decentralized-convex/messages";
// eslint-disable-next-line no-restricted-imports -- Expo Router has no route loaders to preload suspense queries.
import { useMutation, useQuery } from "@tanstack/react-query";
import { listNames } from "@decentralized-convex/messages";
import { pdsMutation, pdsQuery } from "@decentralized-convex/tanstack-query";
import { pds } from "@vera/backend/pds";

import type { ReactionSummary } from "./reactions";
import type { Message, MessageAttachment } from "~/features/conversation/types";
import { useAccount } from "./account";
import * as optimistic from "./optimistic";
import { useProfileState } from "./profiles";
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
    quote: message.quote,
    sentAt: new Date(message.sentAt),
    threadId: message.threadId,
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
