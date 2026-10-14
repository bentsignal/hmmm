import type { ActivityItem } from "@decentralized-convex/messages";
import type * as Notifications from "expo-notifications";
import { useEffect, useEffectEvent } from "react";
import { setBadgeCountAsync } from "expo-notifications";
import { useQueries } from "@tanstack/react-query";
import { pdsQuery } from "@decentralized-convex/tanstack-query";
import { pds } from "@vera/backend/pds";

import { isUnseen } from "~/features/activity/activity";
import { useAccounts } from "~/features/messaging/account";
import { pdsResultOr } from "~/features/messaging/results";
import { deliveredAt, dismissPresented, stringField } from "./presented";

/** A query's data (null if its PDS failed) and when it last arrived. */
interface Snapshot<Item> {
  readonly data: readonly Item[] | null | undefined;
  readonly dataUpdatedAt: number;
}

/**
 * Only data that arrived after the notification can settle it; older data
 * may predate its message or invitation.
 */
function current<Item>(snapshot: Snapshot<Item> | undefined, arrived: number) {
  if (snapshot?.data == null || arrived > snapshot.dataUpdatedAt) return null;
  return snapshot.data;
}

/** Whether the conversation is in the inbox with nothing unread. */
function isRead(
  inbox: Snapshot<{ conversationId: string; unreadCount: number }> | undefined,
  conversationId: string,
  arrived: number,
) {
  const matches = (current(inbox, arrived) ?? []).filter(
    (conversation) => conversation.conversationId === conversationId,
  );
  return (
    matches.length > 0 &&
    matches.every((conversation) => conversation.unreadCount === 0)
  );
}

/**
 * Whether the reactions to a message have been seen in Activity (or are
 * no longer there): its item is gone or holds nothing unseen.
 */
function isReactionSeen(
  activity: Snapshot<ActivityItem> | undefined,
  messageId: string | undefined,
  arrived: number,
) {
  const items = current(activity, arrived);
  if (items === null || messageId === undefined) return false;
  const item = items.find(({ key }) => key === `reactions:${messageId}`);
  return item === undefined || !isUnseen(item);
}

/** Whether the invitation to the space is no longer pending. */
function isAnswered(
  invites: Snapshot<{ spaceId: string }> | undefined,
  spaceId: string | undefined,
  arrived: number,
) {
  const pending = current(invites, arrived);
  return (
    pending !== null && !pending.some((invite) => invite.spaceId === spaceId)
  );
}

/**
 * Keeps the app icon badge equal to the Activity tab's: activity not yet
 * seen plus pending space invitations, summed over every signed-in account
 * (the tab follows the account filter; the icon doesn't). Activity and
 * invites are live queries, so seeing a row or answering an invite, here
 * or on another device, updates it.
 *
 * A push sets the badge to its own account's count, because the server
 * knows nothing of the device's other accounts. With several accounts the
 * icon can read low while the app is closed, and is exact again once the
 * app opens.
 *
 * Also clears delivered notifications nobody needs anymore: a
 * conversation's once it has nothing unread, a reaction's once it's been
 * seen in Activity, and an invitation's once it's answered. Android
 * launchers count notifications, so this is what clears the badge there.
 */
export function useAppBadge() {
  const accounts = useAccounts().map((account) => account.address);
  // undefined while loading, null if the PDS couldn't answer.
  const inboxes = useQueries({
    queries: accounts.map((session) =>
      pdsQuery({
        args: { channels: true },
        options: { select: (result) => pdsResultOr(result, null) },
        query: pds.messages.inbox,
        session,
      }),
    ),
  });
  const invites = useQueries({
    queries: accounts.map((session) =>
      pdsQuery({
        args: {},
        options: { select: (result) => pdsResultOr(result, null) },
        query: pds.messages.spaceInvites,
        session,
      }),
    ),
  });
  const activity = useQueries({
    queries: accounts.map((session) =>
      pdsQuery({
        args: {},
        options: { select: (result) => pdsResultOr(result, null) },
        query: pds.messages.activity,
        session,
      }),
    ),
  });

  const loaded = [...inboxes, ...invites, ...activity].every(
    (result) => result.data !== undefined,
  );
  const unseen = activity
    .flatMap((result) => result.data ?? [])
    .filter(isUnseen).length;
  const pending = invites.reduce(
    (sum, result) => sum + (result.data?.length ?? 0),
    0,
  );
  const total = loaded ? unseen + pending : undefined;

  /** Matches a notification to its account's conversation or invitation. */
  function isSettled(notification: Notifications.Notification) {
    const data = notification.request.content.data;
    const index = accounts.indexOf(stringField(data, "accountId") ?? "");
    if (index === -1) return false;
    const arrived = deliveredAt(notification);
    if (stringField(data, "kind") === "reaction") {
      return isReactionSeen(
        activity[index],
        stringField(data, "messageId"),
        arrived,
      );
    }
    const conversationId = stringField(data, "conversationId");
    if (conversationId !== undefined) {
      return isRead(inboxes[index], conversationId, arrived);
    }
    return (
      stringField(data, "kind") === "spaceInvite" &&
      isAnswered(invites[index], stringField(data, "spaceId"), arrived)
    );
  }

  const sync = useEffectEvent(() => {
    if (total === undefined) return;
    void setBadgeCountAsync(total).catch(() => false);
    void dismissPresented(isSettled).catch(() => null);
  });

  // Changes whenever any count or read state does.
  const version = [...inboxes, ...invites, ...activity]
    .map((result) => result.dataUpdatedAt)
    .join(" ");
  // eslint-disable-next-line no-restricted-syntax -- The icon badge and delivered notifications are OS state outside React, synced whenever the counts change.
  useEffect(() => {
    sync();
  }, [total, version]);
}
