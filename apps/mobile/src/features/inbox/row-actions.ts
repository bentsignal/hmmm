import type { ComponentProps } from "react";
import { pds } from "@vera/backend/pds";

import type { ConversationSummary, ThreadSummaryRow } from "./types";
import type { SymbolIcon } from "~/components/symbol-icon";
import type { useRunAs } from "~/features/messaging/account";
import { showSetMuted } from "~/features/messaging/channel-settings";
import {
  showThreadFollowed,
  showThreadRead,
} from "~/features/messaging/thread-lists";

type IconName = Extract<ComponentProps<typeof SymbolIcon>["name"], object>;

type RunAs = ReturnType<typeof useRunAs>;

/** One action in an Inbox row's long-press menu. */
export interface RowAction {
  key: string;
  label: string;
  icon: {
    ios: NonNullable<IconName["ios"]>;
    android: NonNullable<IconName["android"]>;
  };
  /** The action's color: the theme color, gray, or red. */
  tone: "accent" | "gray" | "destructive";
  onPress: () => void;
}

function pinAction(runAs: RunAs, conversation: ConversationSummary) {
  const pinned = conversation.pinnedAt !== null;
  return {
    key: "pin",
    label: pinned ? "Unpin" : "Pin",
    icon: pinned
      ? { android: "keep_off", ios: "pin.slash.fill" }
      : { android: "push_pin", ios: "pin.fill" },
    tone: "accent",
    onPress: () =>
      void runAs(
        conversation.account,
        pds.messages.setPinned({
          conversationId: conversation.id,
          pinned: !pinned,
        }),
      ),
  } satisfies RowAction;
}

/**
 * An Inbox row's long-press menu: Pin, Mark as Read, Hide or Show Alerts
 * (mutes the person, group, or channel), Hide for a channel (it stays in
 * its space), and Leave Group. Rows have no swipe actions:
 * a sideways swipe on Home moves between its pages.
 */
export function inboxMenuActions(
  runAs: RunAs,
  conversation: ConversationSummary,
) {
  const markRead = {
    key: "read",
    label: "Mark as Read",
    icon: { android: "drafts", ios: "envelope.open" },
    tone: "accent",
    onPress: () =>
      void runAs(
        conversation.account,
        pds.messages.markRead({
          conversationId: conversation.id,
          readAt: Date.now(),
        }),
      ),
  } satisfies RowAction;
  const hide = {
    key: "hide",
    label: "Hide",
    icon: { android: "visibility_off", ios: "eye.slash.fill" },
    tone: "gray",
    onPress: () =>
      void runAs(
        conversation.account,
        pds.messages.setShowInInbox({
          conversationId: conversation.id,
          show: false,
        }),
      ),
  } satisfies RowAction;
  const muted = !conversation.muted;
  const alerts = {
    key: "alerts",
    label: conversation.muted ? "Show Alerts" : "Hide Alerts",
    icon: conversation.muted
      ? { android: "notifications", ios: "bell.fill" }
      : { android: "notifications_off", ios: "bell.slash.fill" },
    tone: "gray",
    onPress: () => {
      const args = { conversationId: conversation.id, muted };
      void runAs(conversation.account, pds.messages.setMuted(args), {
        optimisticUpdate: (store) => showSetMuted(store, args),
      });
    },
  } satisfies RowAction;
  const leave = {
    key: "leave",
    label: "Leave Group",
    icon: { android: "logout", ios: "rectangle.portrait.and.arrow.right" },
    tone: "destructive",
    onPress: () =>
      void runAs(
        conversation.account,
        pds.messages.leaveConversation({ conversationId: conversation.id }),
      ),
  } satisfies RowAction;
  return [
    pinAction(runAs, conversation),
    ...(conversation.unreadCount > 0 ? [markRead] : []),
    alerts,
    ...(conversation.kind === "channel" ? [hide] : []),
    ...(conversation.kind === "group" ? [leave] : []),
  ];
}

/**
 * A thread row's long-press menu: Open Conversation, Mark as Read, and
 * Unfollow Thread (its bell off), which also takes it out of the Inbox.
 */
export function threadMenuActions(
  runAs: RunAs,
  thread: ThreadSummaryRow,
  openConversation: () => void,
) {
  const { account, conversationId, threadId } = thread;
  const open = {
    key: "conversation",
    label: "Open Conversation",
    icon: { android: "forum", ios: "bubble.left.and.bubble.right" },
    tone: "accent",
    onPress: openConversation,
  } satisfies RowAction;
  const markRead = {
    key: "read",
    label: "Mark as Read",
    icon: { android: "drafts", ios: "envelope.open" },
    tone: "accent",
    onPress: () =>
      void runAs(
        account,
        pds.messages.markThreadRead({
          conversationId,
          readAt: thread.lastActivityAt.getTime(),
          threadId,
        }),
        { optimisticUpdate: (store) => showThreadRead(store, { threadId }) },
      ),
  } satisfies RowAction;
  const unfollow = {
    key: "unfollow",
    label: "Unfollow Thread",
    icon: { android: "notifications_off", ios: "bell.slash.fill" },
    tone: "gray",
    onPress: () => {
      const args = { conversationId, followed: false, threadId };
      void runAs(account, pds.messages.setThreadFollowed(args), {
        optimisticUpdate: (store) => showThreadFollowed(store, args),
      });
    },
  } satisfies RowAction;
  return [open, ...(thread.unreadCount > 0 ? [markRead] : []), unfollow];
}

/**
 * Runs an action once the menu has closed, so the change it makes (a row
 * moving to the top, say) doesn't interrupt the animation.
 */
export function afterMenuCloses(action: () => void) {
  setTimeout(action, 300);
}
