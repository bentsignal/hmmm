import type { ComponentProps, ReactNode } from "react";
import type { View as NativeView } from "react-native";
import type { AnimatedRef } from "react-native-reanimated";
import { createContext, use, useState } from "react";
import { View } from "react-native";
import Animated, {
  LayoutAnimationConfig,
  useAnimatedRef,
} from "react-native-reanimated";

import type { PreviewShape } from "./glass-message-menu";
import type { Message } from "./types";
import { cn } from "~/lib/cn";
import { impact, selectionTick } from "~/lib/native-extras";
import { rowOrder } from "./build-rows";
import { GrowingSpace, useOwnLift } from "./grow";
import {
  MessageTargetProvider,
  useIsLifted,
  useLiftMessage,
  useMessageActions,
  useSqueeze,
} from "./message-actions";
import { ChipRow } from "./reaction-chips";
import { useRowTarget } from "./row-touch";
import { NAME_CLEARANCE, TAPBACK_SPACE, Tapbacks } from "./tapbacks";

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

/** How a row's reactions make room for themselves (see `GrowingSpace`). */
interface Room {
  /** The row's order (see `rowOrder`). */
  order: number;
  /** Whether they arrived while the conversation was on screen. */
  animate: boolean;
  /** The message, measured to tell whether it's on screen. */
  measured: AnimatedRef<NativeView>;
}

/**
 * Space above a bubble for its tapbacks, opened as the first arrives:
 * what they need beyond `roomAbove`, the space already there (the sender's
 * name), which they rise beside.
 */
function TapbackSpace({
  open,
  roomAbove,
  room,
}: {
  open: boolean;
  roomAbove: number;
  room: Room;
}) {
  return (
    <GrowingSpace
      height={open ? Math.max(0, TAPBACK_SPACE - roomAbove) : 0}
      {...room}
    />
  );
}

/** Stacked rows' chips, under the message. */
function Chips({
  open,
  room,
  ...row
}: ComponentProps<typeof ChipRow> & { open: boolean; room: Room }) {
  const [used, setUsed] = useState(open);
  if (open && !used) setUsed(true);
  // Already there when the row appeared: laid out with it.
  if (!room.animate) return open ? <ChipRow {...row} /> : null;
  return used ? <GrowingChips open={open} room={room} {...row} /> : null;
}

/**
 * Chips that arrive while you watch, in space that opens to fit them. The
 * row moves up as it opens (see `useRowLift`), and the chips stay put:
 * they're drawn where they end up, and pop in.
 */
function GrowingChips({
  open,
  room,
  ...row
}: ComponentProps<typeof ChipRow> & { open: boolean; room: Room }) {
  const [natural, setNatural] = useState(0);
  const stay = useOwnLift(room.order, -1);
  return (
    <View>
      <GrowingSpace height={open ? natural : 0} {...room} />
      <Animated.View
        // Laid out on its own, as wide as the row, so it has its full
        // height whatever the space's.
        className="absolute inset-x-0 top-0"
        style={stay}
        onLayout={(event) => setNatural(event.nativeEvent.layout.height)}
      >
        {open && <ChipRow {...row} />}
      </Animated.View>
    </View>
  );
}

/** Where a message's top part reports its width, so tapbacks sit on it. */
const TopPartContext = createContext<((width: number) => void) | null>(null);

/**
 * Wraps a message's top part (its first photo, its text, or its first link
 * card): tapbacks sit on that part's corner, not on the widest part's.
 */
export function TopPart({ children }: { children: ReactNode }) {
  const report = use(TopPartContext);
  if (report === null) return children;
  return (
    <View onLayout={(event) => report(event.nativeEvent.layout.width)}>
      {children}
    </View>
  );
}

/**
 * Where tapbacks go: on the top part's corner (`inset` in from the
 * message's edge), and beside the sender's name unless they'd cover it.
 */
function useTapbackPlacement(nameEnd: number | undefined) {
  // Where the tapbacks' left edge sits, once laid out.
  const [left, setLeft] = useState<number>();
  const [widths, setWidths] = useState({ body: 0, top: 0 });
  return {
    besideName: clearsName(nameEnd, left),
    inset: Math.max(0, widths.body - widths.top),
    onBodyWidth: (body: number) =>
      setWidths((current) => ({ ...current, body })),
    onTopWidth: (top: number) => setWidths((current) => ({ ...current, top })),
    onPlaced: setLeft,
  };
}

/** Whether tapbacks starting at `left` clear a name ending at `nameEnd`. */
function clearsName(nameEnd: number | undefined, left: number | undefined) {
  if (nameEnd === undefined || left === undefined) return true;
  return nameEnd + NAME_CLEARANCE <= left;
}

/**
 * The whole message (see `useLiftMessage`): `openReactions` opens who
 * reacted to it, as its tapbacks do. When `fromRow`, a hold or double tap
 * beside its parts lifts it with its menu, squeezing it (`squeeze`, for
 * its parts) while held.
 */
function useWholeMessage(
  message: Parameters<typeof useLiftMessage>[0],
  fromRow: boolean,
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
  );
  return {
    openReactions: () => {
      selectionTick();
      liftWhole("reactions");
    },
    squeeze: squeeze.style,
  };
}

/**
 * A message whose parts open the glass overlay on a long press or a double
 * tap (each wraps itself in `MenuTargetView` or uses `useMenuTarget`). Its reactions show as iMessage tapbacks over the top
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
  liftedFromRow,
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
  /**
   * Where the name above ends: tapbacks that would cover it get space of
   * their own instead, between the name and the bubble, as in Messages.
   */
  tapbacksClearOf?: number;
  /** A hold or double tap beside its parts lifts it all (bubbles). */
  liftedFromRow?: boolean;
  children: ReactNode;
}) {
  const { toggleReaction, viewReactions } = useMessageActions();
  const reactions = useShownReactions(message);
  const grows = useSeenWithout(reactions, message.reactions !== undefined);
  const lifted = useIsLifted(message.id);
  const body = useAnimatedRef<NativeView>();
  const whole = useWholeMessage(
    { align, measured: body, message, preview: children, shape },
    liftedFromRow === true,
  );
  const has = reactions.length > 0;
  const placement = useTapbackPlacement(tapbacksClearOf);
  const room = {
    animate: grows,
    measured: body,
    order: rowOrder(message.sentAt),
  } satisfies Room;
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
            open={has}
            roomAbove={placement.besideName ? roomAbove : 0}
            room={room}
          />
        )}
        <View
          ref={body}
          onLayout={(event) =>
            placement.onBodyWidth(event.nativeEvent.layout.width)
          }
        >
          <Animated.View style={whole.squeeze}>
            <TopPartContext value={placement.onTopWidth}>
              <MessageTargetProvider
                message={message}
                align={align}
                shape={shape}
              >
                {children}
              </MessageTargetProvider>
            </TopPartContext>
          </Animated.View>
          {/* After the bubble, so they draw over it on every platform. */}
          {reactionStyle === "tapbacks" && has && (
            <Tapbacks
              reactions={reactions}
              align={align}
              hidden={lifted}
              inset={placement.inset}
              onPlaced={placement.onPlaced}
              onPress={whole.openReactions}
            />
          )}
        </View>
        {reactionStyle === "chips" && (
          <Chips
            open={has}
            room={room}
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
