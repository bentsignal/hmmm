import type { ComponentProps, ReactNode } from "react";
import type { View as NativeView } from "react-native";
import { useRef, useState } from "react";
import { View } from "react-native";
import { LayoutAnimationConfig } from "react-native-reanimated";

import type { PreviewShape } from "./glass-message-menu";
import type { Message } from "./types";
import { cn } from "~/lib/cn";
import { impact, selectionTick } from "~/lib/native-extras";
import { Expand } from "./expand";
import {
  MessageTargetProvider,
  useIsLifted,
  useMessageActions,
  useOpenReactions,
} from "./message-actions";
import { ChipRow } from "./reaction-chips";
import { TAPBACK_SPACE, Tapbacks } from "./tapbacks";

/**
 * The message's reactions, keeping the last loaded ones on screen while
 * they reload (new messages change which reactions a page asks for).
 */
function useShownReactions(message: Message) {
  const [lastLoaded, setLastLoaded] = useState(message.reactions);
  if (message.reactions !== undefined && message.reactions !== lastLoaded) {
    setLastLoaded(message.reactions);
  }
  return message.reactions ?? lastLoaded ?? [];
}

/**
 * Whether the message was on screen without reactions: then its first one
 * arrives while you watch, and makes room for itself smoothly. A message
 * that already has reactions when it appears (opening a conversation,
 * scrolling to it) shows them in place.
 */
function useSeenWithout(reactions: readonly unknown[], loaded: boolean) {
  const [seenWithout, setSeenWithout] = useState(
    loaded && reactions.length === 0,
  );
  if (!seenWithout && loaded && reactions.length === 0) setSeenWithout(true);
  return seenWithout;
}

/**
 * Space above a bubble for its tapbacks, opened as the first arrives:
 * what they need beyond `roomAbove`, the space already there (the sender's
 * name), which they rise beside.
 */
function TapbackSpace({
  open,
  animate,
  roomAbove,
}: {
  open: boolean;
  animate: boolean;
  roomAbove: number;
}) {
  const height = Math.max(0, TAPBACK_SPACE - roomAbove);
  if (height === 0) return null;
  if (!animate) return open ? <View style={{ height }} /> : null;
  return (
    <Expand open={open}>
      <View style={{ height }} />
    </Expand>
  );
}

/** Stacked rows' chips, opened smoothly when the first arrives (`animate`). */
function Chips({
  open,
  animate,
  ...row
}: ComponentProps<typeof ChipRow> & { open: boolean; animate: boolean }) {
  if (!animate) return open ? <ChipRow {...row} /> : null;
  return (
    <Expand open={open}>
      <ChipRow {...row} />
    </Expand>
  );
}

/**
 * A message whose parts open the glass overlay on a long press, and its
 * reactions on a double tap (each wraps itself in `MenuTargetView` or uses
 * `useMenuTarget`). Its reactions show as iMessage tapbacks over the top
 * corner (`tapbacks`, for bubbles), which show who reacted when tapped, or
 * as Slack's chips underneath (`chips`, for stacked rows), which add or
 * take back that reaction when tapped and show who reacted with it when
 * held.
 */
export function InteractiveMessage({
  message,
  align,
  shape,
  reactionStyle,
  roomAbove = 0,
  tapbacksClearOf,
  children,
}: {
  message: Message;
  /** Which side the message sits on. */
  align: "end" | "start";
  /** How its text lifts. */
  shape: PreviewShape;
  reactionStyle: "chips" | "tapbacks";
  /** Space already above the message (the sender's name) tapbacks can use. */
  roomAbove?: number;
  /** Where the name above ends, which tapbacks keep clear of. */
  tapbacksClearOf?: number;
  children: ReactNode;
}) {
  const { toggleReaction, viewReactions } = useMessageActions();
  const reactions = useShownReactions(message);
  const grows = useSeenWithout(reactions, message.reactions !== undefined);
  const lifted = useIsLifted(message.id);
  const body = useRef<NativeView>(null);
  const openReactions = useOpenReactions({
    align,
    measured: body,
    message,
    preview: children,
    shape,
  });
  const has = reactions.length > 0;
  return (
    // Reactions already there when the row mounts don't pop in on scroll;
    // only one added while the conversation is open does.
    <LayoutAnimationConfig skipEntering>
      <View
        className={cn(
          align === "end" ? "self-end" : "self-start",
          // Chips wrap across the row, not just under the message.
          reactionStyle === "chips" && "self-stretch",
        )}
      >
        {reactionStyle === "tapbacks" && (
          <TapbackSpace open={has} animate={grows} roomAbove={roomAbove} />
        )}
        <View ref={body}>
          <MessageTargetProvider message={message} align={align} shape={shape}>
            {children}
          </MessageTargetProvider>
          {/* After the bubble, so they draw over it on every platform. */}
          {reactionStyle === "tapbacks" && has && (
            <Tapbacks
              reactions={reactions}
              align={align}
              hidden={lifted}
              clearOf={tapbacksClearOf}
              onPress={openReactions}
            />
          )}
        </View>
        {reactionStyle === "chips" && (
          <Chips
            open={has}
            animate={grows}
            reactions={reactions}
            align={align}
            onToggle={(emoji) => {
              selectionTick();
              toggleReaction(message.id, emoji);
            }}
            onHold={(emoji) => {
              impact();
              viewReactions(message.id, emoji);
            }}
          />
        )}
      </View>
    </LayoutAnimationConfig>
  );
}
