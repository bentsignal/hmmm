import type { Channel, Conversation } from "@decentralized-convex/messages";
import type { PdsOptimisticLocalStore } from "@decentralized-convex/tanstack-query";
import { useMutation } from "@tanstack/react-query";
import { channelName } from "@decentralized-convex/messages";
import { pdsMutation } from "@decentralized-convex/tanstack-query";
import { pds } from "@vera/backend/pds";

import { useAccount } from "./account";
import { updateSpace } from "./optimistic";

// A channel's own settings (Show in Inbox, Hide Alerts, its name, deleting
// it) and a space's Hide Alerts, each shown the moment it's changed.

type Store = PdsOptimisticLocalStore;

/** Changes a channel in every loaded space that lists it. */
function updateChannel(
  store: Store,
  conversationId: string,
  change: (channel: Channel) => Channel | null,
) {
  const spaceIds = new Set([
    ...store.getAllQueries(pds.messages.space).map(({ args }) => args.spaceId),
    ...store
      .getAllQueries(pds.messages.spaces)
      .flatMap(({ value }) => value ?? [])
      .map(({ spaceId }) => spaceId),
  ]);
  for (const spaceId of spaceIds) {
    updateSpace(store, spaceId, (space) =>
      space.channels.some((item) => item.conversationId === conversationId)
        ? {
            ...space,
            channels: space.channels.flatMap((item) => {
              if (item.conversationId !== conversationId) return [item];
              const changed = change(item);
              return changed === null ? [] : [changed];
            }),
          }
        : space,
    );
  }
}

/** Changes a conversation in every loaded inbox and on its own. */
function updateConversation(
  store: Store,
  conversationId: string,
  change: (item: Conversation) => Conversation | null,
) {
  for (const { request, value } of store.getAllQueries(pds.messages.inbox)) {
    if (value === undefined) continue;
    store.setQuery(
      request,
      value.flatMap((item) => {
        if (item.conversationId !== conversationId) return [item];
        const changed = change(item);
        return changed === null ? [] : [changed];
      }),
    );
  }
  const request = pds.messages.conversation({ conversationId });
  const conversation = store.getQuery(request);
  if (conversation != null) {
    const changed = change(conversation);
    if (changed !== null) store.setQuery(request, changed);
  }
}

/** Shows a conversation muted or not, in its space and the inbox. */
export function showSetMuted(
  store: Store,
  args: { conversationId: string; muted: boolean },
) {
  const { conversationId, muted } = args;
  updateChannel(store, conversationId, (channel) => ({ ...channel, muted }));
  updateConversation(store, conversationId, (item) => ({ ...item, muted }));
}

function showShowInInbox(
  store: Store,
  args: { conversationId: string; show: boolean },
) {
  const { conversationId, show } = args;
  updateChannel(store, conversationId, (channel) => ({
    ...channel,
    showInInbox: show,
  }));
  // Shown again, it comes back with the PDS's next inbox.
  if (!show) updateConversation(store, conversationId, () => null);
}

function showRename(
  store: Store,
  args: { conversationId: string; name: string },
) {
  const name = channelName(args.name);
  updateChannel(store, args.conversationId, (channel) => ({
    ...channel,
    name,
  }));
  updateConversation(store, args.conversationId, (item) => ({
    ...item,
    name,
  }));
}

function showDelete(store: Store, args: { conversationId: string }) {
  updateChannel(store, args.conversationId, () => null);
  updateConversation(store, args.conversationId, () => null);
}

function showSpaceMuted(
  store: Store,
  args: { muted: boolean; spaceId: string },
) {
  updateSpace(store, args.spaceId, (space) => ({
    ...space,
    muted: args.muted,
  }));
}

/** Channel and space settings as the scoped account. */
export function useChannelSettings() {
  const { address: session } = useAccount();
  return {
    deleteChannel: useMutation(
      pdsMutation({
        mutation: pds.messages.deleteChannel,
        optimisticUpdate: showDelete,
        session,
      }),
    ),
    renameChannel: useMutation(
      pdsMutation({
        mutation: pds.messages.renameChannel,
        optimisticUpdate: showRename,
        session,
      }),
    ),
    setMuted: useMutation(
      pdsMutation({
        mutation: pds.messages.setMuted,
        optimisticUpdate: showSetMuted,
        session,
      }),
    ),
    setShowInInbox: useMutation(
      pdsMutation({
        mutation: pds.messages.setShowInInbox,
        optimisticUpdate: showShowInInbox,
        session,
      }),
    ),
    setSpaceMuted: useMutation(
      pdsMutation({
        mutation: pds.messages.setSpaceMuted,
        optimisticUpdate: showSpaceMuted,
        session,
      }),
    ),
  };
}
