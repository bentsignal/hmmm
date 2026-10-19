import type { ReactNode } from "react";
import type { View as NativeView } from "react-native";
import { useState } from "react";
import { View } from "react-native";
import Animated, {
  LayoutAnimationConfig,
  useAnimatedRef,
} from "react-native-reanimated";

import type { PreviewShape } from "./glass-message-menu";
import type { Parts } from "./reaction-parts";
import type { Message } from "./types";
import type { ReactionPart } from "~/features/messaging/reactions";
import { cn } from "~/lib/cn";
import { rowOrder } from "./build-rows";
import { GrowingSpace } from "./grow";
import {
  MessageTargetProvider,
  useLiftMessage,
  useSqueeze,
} from "./message-actions";
import { PartChips } from "./part-chips";
import { PartsProvider, usePartReactions } from "./reaction-parts";
import { Place } from "./row-place";
import { useRowTarget } from "./row-touch";
import { NAME_CLEARANCE, TAPBACK_SPACE } from "./tapbacks";

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

/** Whether tapbacks starting at `left` clear a name ending at `nameEnd`. */
function clearsName(nameEnd: number | undefined, left: number | undefined) {
  if (nameEnd === undefined || left === undefined) return true;
  return nameEnd + NAME_CLEARANCE <= left;
}

/**
 * The whole message (see `useLiftMessage`), which a hold or double tap
 * beside its parts lifts with its menu when `fromRow`, squeezing it
 * (`squeeze`, for its parts) while held. Beside a message of several
 * parts, the one nearest the touch lifts instead, so a reaction picked
 * there goes to the part you meant.
 */
function useWholeMessage(
  message: Parameters<typeof useLiftMessage>[0],
  { fromRow, severalParts }: { fromRow: boolean; severalParts: boolean },
) {
  const liftWhole = useLiftMessage(message);
  const squeeze = useSqueeze();
  useRowTarget(
    fromRow
      ? {
          lift: () => liftWhole("actions"),
          pressIn: squeeze.pressIn,
          release: squeeze.release,
        }
      : undefined,
    severalParts ? "nearest" : undefined,
  );
  return squeeze.style;
}

/**
 * Space above a bubble for its top part's tapbacks, opened as the first
 * arrives: what they need beyond `roomAbove`, the space already there
 * (the sender's name), which they rise beside unless they'd cover it.
 */
function TapbackSpace({
  parts,
  also,
  roomAbove = 0,
  clearOf,
  left,
}: {
  parts: Parts;
  /** Parts drawn together with the top one (see `Reactable`'s `also`). */
  also?: readonly ReactionPart[];
  roomAbove?: number;
  /** Where the name above ends. */
  clearOf?: number;
  /** Where the tapbacks' left edge sits, once laid out. */
  left?: number;
}) {
  const { animate, reactions } = usePartReactions(parts, parts.top, also);
  const room = clearsName(clearOf, left) ? roomAbove : 0;
  const height = reactions.length > 0 ? Math.max(0, TAPBACK_SPACE - room) : 0;
  return (
    <GrowingSpace
      height={height}
      order={parts.order}
      place={0}
      animate={animate}
      measured={parts.measured}
    />
  );
}

/** Stacked rows' last part's chips, under the whole message. */
function EndChips({ parts, part }: { parts: Parts; part: ReactionPart }) {
  const { animate, reactions } = usePartReactions(parts, part);
  return (
    <PartChips
      messageId={parts.message.id}
      part={part}
      reactions={reactions}
      align={parts.align}
      room={{
        animate,
        measured: parts.measured,
        order: parts.order,
        place: Place.bottom,
      }}
    />
  );
}

/** How a message's parts show their reactions (see `InteractiveMessage`). */
interface Layout {
  /** Which side the message sits on. */
  align: "end" | "start";
  /** How its text lifts. */
  shape: PreviewShape;
  reactionStyle: "chips" | "tapbacks";
  /** The part on top, whose tapbacks rise above the message. */
  top?: ReactionPart;
  /** Parts drawn together with the top one, a stack of photos. */
  topAlso?: readonly ReactionPart[];
  /** The part whose chips go under everything, footers and all. */
  chipsAtEnd?: ReactionPart | null;
  /**
   * Whether room for reactions can open between its parts (a part's
   * tapbacks above it, or chips under it), not just above or below it.
   */
  inner?: boolean;
}

/**
 * A message whose parts open the glass overlay on a long press or a double
 * tap (each wraps itself in `MenuTargetView` or uses `useMenuTarget`). Each part that takes reactions (see `Reactable`) shows
 * its own: as iMessage tapbacks over its top corner (`tapbacks`, for
 * bubbles), which show who reacted when tapped, or as Slack's chips under
 * it (`chips`, for stacked rows), which add or take back that reaction
 * when tapped and show who reacted with it when held.
 */
export function InteractiveMessage({
  message,
  roomAbove,
  tapbacksClearOf,
  liftedFromRow,
  children,
  ...layout
}: Layout & {
  message: Message;
  /** Space already above the message (the sender's name) tapbacks can use. */
  roomAbove?: number;
  /**
   * Where the name above ends: tapbacks that would cover it get space of
   * their own instead, between the name and the bubble, as in Messages.
   */
  tapbacksClearOf?: number;
  /** A hold or double tap beside its parts lifts it all (bubbles). */
  liftedFromRow?: boolean;
  children: ReactNode;
}) {
  const { align, shape, reactionStyle, chipsAtEnd = null } = layout;
  const reactions = useShownReactions(message);
  const body = useAnimatedRef<NativeView>();
  const squeeze = useWholeMessage(
    {
      align,
      measured: body,
      message,
      part: layout.top ?? "message",
      preview: children,
      shape,
    },
    { fromRow: liftedFromRow === true, severalParts: layout.inner === true },
  );
  // Where the top part's tapbacks' left edge sits, once laid out.
  const [topLeft, setTopLeft] = useState<number>();
  const parts = {
    align,
    chipsAtEnd,
    inner: layout.inner ?? false,
    loaded: message.reactions !== undefined,
    measured: body,
    message,
    onTopPlaced: setTopLeft,
    order: rowOrder(message.sentAt),
    reactionStyle,
    reactions,
    shape,
    top: layout.top ?? "message",
  } satisfies Parts;
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
          <TapbackSpace
            parts={parts}
            also={layout.topAlso}
            roomAbove={roomAbove}
            clearOf={tapbacksClearOf}
            left={topLeft}
          />
        )}
        <View ref={body}>
          <Animated.View style={squeeze}>
            <PartsProvider parts={parts}>
              <MessageTargetProvider
                message={message}
                align={align}
                shape={shape}
              >
                {children}
              </MessageTargetProvider>
            </PartsProvider>
          </Animated.View>
        </View>
        {reactionStyle === "chips" && chipsAtEnd !== null && (
          <EndChips parts={parts} part={chipsAtEnd} />
        )}
      </View>
    </LayoutAnimationConfig>
  );
}
