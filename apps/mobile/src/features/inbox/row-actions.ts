import type { ComponentProps } from "react";
import { pds } from "@vera/backend/pds";

import type { ConversationSummary } from "./types";
import type { SymbolIcon } from "~/components/symbol-icon";
import type { useRunAs } from "~/features/messaging/account";

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
 * An Inbox row's long-press menu: Pin, Mark as Read, Hide for a channel
 * (it stays in its space), and Leave Group. Rows have no swipe actions:
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
    ...(conversation.kind === "channel" ? [hide] : []),
    ...(conversation.kind === "group" ? [leave] : []),
  ];
}

/**
 * Runs an action once the menu has closed, so the change it makes (a row
 * moving to the top, say) doesn't interrupt the animation.
 */
export function afterMenuCloses(action: () => void) {
  setTimeout(action, 300);
}
