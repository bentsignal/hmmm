import type {
  AlertLevel,
  Channel,
  Conversation,
  Space,
} from "@decentralized-convex/messages";

// What a group, channel, or space alerts you about (Activity and
// notifications): every message, only ones that @mention you, or nothing.

export type { AlertLevel };

export const ALERT_CHOICES = [
  { label: "All Messages", value: "all" },
  { label: "Only @Mentions", value: "mentions" },
  { label: "Nothing", value: "none" },
] as const satisfies readonly { label: string; value: AlertLevel }[];

/** A conversation's alerts; servers from before levels say only `muted`. */
export function conversationAlerts(
  conversation: Pick<Conversation, "alerts" | "muted">,
) {
  return conversation.alerts ?? (conversation.muted ? "none" : "all");
}

/** A space's alerts for its channels (see `conversationAlerts`). */
export function spaceAlerts(space: Pick<Space, "alerts" | "muted">) {
  return space.alerts ?? (space.muted === true ? "none" : "all");
}

/** A channel's alerts: its own choice, or else its space's. */
export function channelAlerts(
  channel: Pick<Channel, "alerts" | "muted">,
  space: Pick<Space, "alerts" | "muted">,
) {
  return (
    channel.alerts ?? (channel.muted === true ? "none" : spaceAlerts(space))
  );
}

/** The icon a row shows beside a name for its alerts, if any. */
export function alertsIcon(level: AlertLevel) {
  if (level === "none") {
    return {
      label: "Alerts hidden",
      name: { android: "notifications_off", ios: "bell.slash.fill" },
    } as const;
  }
  if (level === "mentions") {
    return {
      label: "Only @mentions",
      name: { android: "alternate_email", ios: "at" },
    } as const;
  }
  return null;
}

/**
 * A long-press menu's alert actions: the other two levels, so any level
 * is one tap away. `set` makes the change.
 */
export function alertMenuActions(
  level: AlertLevel,
  set: (level: AlertLevel) => void,
) {
  const actions = {
    all: {
      key: "alerts-all",
      label: level === "none" ? "Show Alerts" : "All Messages",
      icon: { android: "notifications", ios: "bell" },
    },
    mentions: {
      key: "alerts-mentions",
      label: "Only @Mentions",
      icon: { android: "alternate_email", ios: "at" },
    },
    none: {
      key: "alerts-none",
      label: "Hide Alerts",
      icon: { android: "notifications_off", ios: "bell.slash" },
    },
  } as const;
  return (["all", "mentions", "none"] as const)
    .filter((choice) => choice !== level)
    .map((choice) => ({
      ...actions[choice],
      tone: "gray" as const,
      onPress: () => set(choice),
    }));
}
