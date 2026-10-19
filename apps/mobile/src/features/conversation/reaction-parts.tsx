import type { ReactNode, Ref } from "react";
import type { View as NativeView } from "react-native";
import type { AnimatedRef } from "react-native-reanimated";
import { createContext, use, useRef, useState } from "react";
import { View } from "react-native";
import Animated from "react-native-reanimated";

import type { PreviewShape } from "./glass-message-menu";
import type { Message } from "./types";
import type {
  ReactionPart,
  ReactionSummary,
} from "~/features/messaging/reactions";
import { reactionsOn } from "~/features/messaging/reactions";
import { selectionTick } from "~/lib/native-extras";
import { GrowingSpace, usePieceLift } from "./grow";
import { mergedReactions } from "./merged-reactions";
import {
  ReactionPartProvider,
  useIsLifted,
  useLiftMessage,
} from "./message-actions";
import { PartChips, StillPart } from "./part-chips";
import { TAPBACK_SPACE, Tapbacks } from "./tapbacks";

/** A message's reactions, as its parts (see `Reactable`) show them. */
export interface Parts {
  readonly message: Message;
  readonly reactions: readonly ReactionSummary[];
  readonly loaded: boolean;
  readonly align: "end" | "start";
  readonly shape: PreviewShape;
  readonly reactionStyle: "chips" | "tapbacks";
  /** The row's order (see `rowOrder`). */
  readonly order: number;
  /** The message, measured to tell whether it's on screen. */
  readonly measured: AnimatedRef<NativeView>;
  /** The top part, whose tapbacks rise into the space above the message. */
  readonly top: ReactionPart;
  /** The part whose chips go under the whole message, if any. */
  readonly chipsAtEnd: ReactionPart | null;
  /** Whether room can open between its parts, not just above or below. */
  readonly inner: boolean;
  /** Where the top part's tapbacks' left edge sits, once laid out. */
  readonly onTopPlaced: (left: number) => void;
}

const PartsContext = createContext<Parts | null>(null);

/** The message whose parts are below; null in the lifted copy. */
export function useParts() {
  return use(PartsContext);
}

/** The message whose parts (see `Reactable`) are below. */
export function PartsProvider({
  parts,
  children,
}: {
  parts: Parts;
  children: ReactNode;
}) {
  return <PartsContext value={parts}>{children}</PartsContext>;
}

/**
 * Whether the part was on screen without reactions: then its first one
 * arrives while you watch, and makes room for itself smoothly. A message
 * that already has reactions when it appears (opening a conversation,
 * scrolling to it) shows them in place.
 */
export function useSeenWithout(reactions: readonly unknown[], loaded: boolean) {
  const [seenWithout, setSeenWithout] = useState(
    loaded && reactions.length === 0,
  );
  if (!seenWithout && loaded && reactions.length === 0) setSeenWithout(true);
  return seenWithout;
}

/**
 * A part's reactions, and whether it was on screen without any. With
 * `also`, the reactions on those parts too, as one (a stack of photos).
 */
export function usePartReactions(
  parts: Parts,
  part: ReactionPart,
  also?: readonly ReactionPart[],
) {
  const reactions =
    also === undefined
      ? reactionsOn(parts.reactions, part)
      : mergedReactions(parts.reactions, [part, ...also]);
  const animate = useSeenWithout(reactions, parts.loaded);
  return { animate, reactions };
}

/** The gap between a message's parts (`gap-1`). */
const PART_GAP = 4;

/** The space a part's tapbacks need above it, past the gap between parts. */
const PART_TAPBACK_SPACE = TAPBACK_SPACE - PART_GAP;

/**
 * A part of a message that takes reactions of its own: an attachment, or
 * the message's text (its first link card when the text is all links).
 * Its tapbacks sit on its top corner, in space that opens above it (the
 * top part's opens above the message), or its chips under it. `place` is
 * where it is in the message, top to bottom (see `Place`).
 */
export function Reactable({
  part,
  place,
  also,
  onTapbacks,
  children,
}: {
  part: ReactionPart;
  place: number;
  /**
   * Parts drawn together with it (a stack of photos), whose tapbacks show
   * on it as one.
   */
  also?: readonly ReactionPart[];
  /** What tapping its tapbacks does, instead of showing who reacted. */
  onTapbacks?: () => void;
  children: ReactNode;
}) {
  const parts = use(PartsContext);
  if (parts === null) return <StillPart part={part}>{children}</StillPart>;
  return parts.reactionStyle === "tapbacks" ? (
    <TapbackPart
      parts={parts}
      part={part}
      place={place}
      also={also}
      onTapbacks={onTapbacks}
    >
      {children}
    </TapbackPart>
  ) : (
    <ChipPart parts={parts} part={part} place={place}>
      {children}
    </ChipPart>
  );
}

function TapbackPart({
  parts,
  part,
  place,
  also,
  onTapbacks,
  children,
}: {
  parts: Parts;
  part: ReactionPart;
  place: number;
  also?: readonly ReactionPart[];
  onTapbacks?: () => void;
  children: ReactNode;
}) {
  const { animate, reactions } = usePartReactions(parts, part, also);
  const ref = useRef<NativeView>(null);
  const lifted = useIsLifted(parts.message.id, part);
  const liftPart = useLiftMessage({
    align: parts.align,
    measured: ref,
    message: parts.message,
    part,
    preview: children,
    shape: parts.shape,
  });
  const top = part === parts.top;
  const has = reactions.length > 0;
  return (
    <ReactionPartProvider part={part}>
      {/* One view, so the space adds no gap between parts of its own. */}
      <View>
        {!top && (
          <GrowingSpace
            height={has ? PART_TAPBACK_SPACE : 0}
            order={parts.order}
            place={place}
            animate={animate}
            measured={parts.measured}
          />
        )}
        <Piece ref={ref} parts={parts} place={place}>
          {children}
          {/* After the part, so they draw over it on every platform. */}
          {has && (
            <Tapbacks
              reactions={reactions}
              align={parts.align}
              hidden={lifted}
              onPlaced={top ? parts.onTopPlaced : undefined}
              onPress={() => {
                selectionTick();
                if (onTapbacks === undefined) liftPart("reactions");
                else onTapbacks();
              }}
            />
          )}
        </Piece>
      </View>
    </ReactionPartProvider>
  );
}

function ChipPart({
  parts,
  part,
  place,
  children,
}: {
  parts: Parts;
  part: ReactionPart;
  place: number;
  children: ReactNode;
}) {
  const { animate, reactions } = usePartReactions(parts, part);
  return (
    <ReactionPartProvider part={part}>
      {/* One view, so the chips add no gap between parts of their own,
          as wide as the row for them to wrap across. */}
      <View className="items-start self-stretch">
        <Piece parts={parts} place={place}>
          {children}
        </Piece>
        {part !== parts.chipsAtEnd && (
          <View className="self-stretch">
            <PartChips
              messageId={parts.message.id}
              part={part}
              reactions={reactions}
              align={parts.align}
              room={{
                animate,
                measured: parts.measured,
                order: parts.order,
                place: place + 1,
              }}
            />
          </View>
        )}
      </View>
    </ReactionPartProvider>
  );
}

/**
 * A piece of a message that takes no reactions of its own (link cards
 * under its text, a thread's count), kept where it belongs while the
 * parts around it make room for theirs. `place` as for `Reactable`.
 */
export function Placed({
  place,
  children,
}: {
  place: number;
  children: ReactNode;
}) {
  const parts = use(PartsContext);
  if (parts === null) return children;
  return (
    <Piece parts={parts} place={place}>
      {children}
    </Piece>
  );
}

/**
 * A piece of a message at `place`, kept where it belongs while room opens
 * between its parts (see `usePieceLift`). A plain view in a message whose
 * room only opens above or below it, so most rows run nothing as one
 * grows.
 */
function Piece({
  parts,
  place,
  ref,
  children,
}: {
  parts: Parts;
  place: number;
  ref?: Ref<NativeView>;
  children: ReactNode;
}) {
  if (!parts.inner) return <View ref={ref}>{children}</View>;
  return (
    <MovingPiece ref={ref} parts={parts} place={place}>
      {children}
    </MovingPiece>
  );
}

function MovingPiece({
  parts,
  place,
  ref,
  children,
}: {
  parts: Parts;
  place: number;
  ref?: Ref<NativeView>;
  children: ReactNode;
}) {
  const lift = usePieceLift(
    parts.order,
    place,
    parts.reactionStyle === "chips",
  );
  return (
    <Animated.View ref={ref} style={lift}>
      {children}
    </Animated.View>
  );
}
