import type { ReactNode } from "react";
import type { NativeScrollEvent, NativeSyntheticEvent } from "react-native";
import { Pressable, ScrollView, Text, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  useSharedValue,
  ZoomIn,
  ZoomOut,
} from "react-native-reanimated";

import type { MediaItem } from "./media-groups";
import type { Parts } from "./reaction-parts";
import type { Message } from "./types";
import type {
  ReactionPart,
  ReactionSummary,
} from "~/features/messaging/reactions";
import { Emoji } from "~/components/emoji";
import { GlassSurface } from "~/components/glass-surface";
import { reactionsOn } from "~/features/messaging/reactions";
import { impact, selectionTick } from "~/lib/native-extras";
import { GrowingSpace, usePieceLift } from "./grow";
import { useMessageActions } from "./message-actions";
import { useStillReactions } from "./part-chips";
import { ChipRow } from "./reaction-chips";
import { useParts, useSeenWithout } from "./reaction-parts";
import { useRevealGesture } from "./reveal";

// The pieces of a stacked row's carousel of photos (`StackedMediaCarousel`).

/** Every card is this tall; its width follows the photo's shape. */
export const CARD_HEIGHT = 200;
const MIN_CARD_WIDTH = 130;
const MAX_CARD_WIDTH = 250;
const CARD_GAP = 6;
/** The row's padding on the right, which the carousel scrolls under. */
const BLEED = 16;
/** One line of chips (`ChipRow`), the least a lane of them takes. */
export const CHIP_LINE = 30;
/** A chip and the gap after it, about, and each line after the first. */
const CHIP_WIDTH = 45;
const NEXT_LINE = 30;

export function cardWidth({ height, width }: MediaItem["attachment"]) {
  if (height === undefined || width === undefined || height === 0) {
    return CARD_HEIGHT;
  }
  return Math.min(
    MAX_CARD_WIDTH,
    Math.max(MIN_CARD_WIDTH, (CARD_HEIGHT * width) / height),
  );
}

/**
 * How tall a card's chips will be once laid out, about: what the lane
 * under the cards opens to before they're measured, so a row that has
 * reactions when it appears is laid out with room for them.
 */
export function chipsHeight(count: number, width: number) {
  if (count === 0) return 0;
  const perLine = Math.max(1, Math.floor(width / CHIP_WIDTH));
  return CHIP_LINE + NEXT_LINE * (Math.ceil(count / perLine) - 1);
}

/** Where each card starts, which a swipe settles on. */
export function cardOffsets(items: readonly MediaItem[]) {
  let at = 0;
  return items.map((item) => {
    const offset = at;
    at += cardWidth(item.attachment) + CARD_GAP;
    return offset;
  });
}

/** The card nearest the carousel's start at `x`. */
function cardAt(offsets: readonly number[], x: number) {
  let nearest = 0;
  for (const [index, offset] of offsets.entries()) {
    const best = offsets[nearest] ?? 0;
    if (Math.abs(offset - x) < Math.abs(best - x)) nearest = index;
  }
  return nearest;
}

/**
 * The reactions the carousel's cards show, and what tapping them does. In
 * the lifted copy (no `parts`), they show what's there and do nothing.
 */
export function useCarouselReactions(message: Message) {
  const parts = useParts();
  const still = useStillReactions();
  const { toggleReaction, viewReactions } = useMessageActions();
  const all = parts?.reactions ?? still ?? [];
  return {
    all,
    loaded: parts?.loaded ?? true,
    on: (part: ReactionPart) => reactionsOn(all, part),
    parts,
    toggle: (part: ReactionPart, emoji: string) => {
      if (parts === null) return;
      selectionTick();
      toggleReaction(message.id, emoji, part);
    },
    view: (part: ReactionPart, emoji?: string) => {
      if (parts === null) return;
      impact();
      viewReactions(message.id, part, emoji);
    },
  };
}

export type CarouselReactionsOf = ReturnType<typeof useCarouselReactions>;

/**
 * A row of chips that opens space for itself under the carousel as the
 * first reaction on any of its cards arrives (see `GrowingSpace`), and
 * closes once none has one. Its chips are drawn where they end up and show
 * as the space opens, as `PartChips`' do.
 */
export function ChipLane({
  parts,
  place,
  open,
  natural,
  onMeasured,
  absolute,
  children,
}: {
  parts: Parts;
  place: number;
  /** Some card has reactions. */
  open: boolean;
  natural: number;
  /** The lane's content, measured, when it's laid out apart (`absolute`). */
  onMeasured?: (height: number) => void;
  /**
   * The chips sit in the carousel, under their cards, rather than here;
   * the lane just makes the room.
   */
  absolute?: boolean;
  children?: ReactNode;
}) {
  const animate = useSeenWithout(open ? [open] : [], parts.loaded);
  const opened = useSharedValue(open ? 1 : 0);
  const stay = usePieceLift(parts.order, place, true, opened);
  return (
    <View>
      <GrowingSpace
        height={open ? natural : 0}
        order={parts.order}
        place={place}
        animate={animate}
        measured={parts.measured}
        opened={opened}
      />
      {!absolute && (
        <Animated.View
          className="absolute inset-x-0 top-0"
          style={stay}
          onLayout={(event) => onMeasured?.(event.nativeEvent.layout.height)}
        >
          {open && children}
        </Animated.View>
      )}
    </View>
  );
}

/** Up to three of a card's emoji and how many reacted, on its corner. */
export function ReactionBadge({
  reactions,
  onPress,
}: {
  reactions: readonly ReactionSummary[];
  onPress: () => void;
}) {
  const total = reactions.reduce((sum, reaction) => sum + reaction.count, 0);
  const mine = reactions.some((reaction) => reaction.mine);
  return (
    <Animated.View
      entering={ZoomIn.duration(220)}
      exiting={ZoomOut.duration(140)}
      className="absolute bottom-2 left-2"
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Reactions: ${reactions
          .map((reaction) => `${reaction.emoji} ${reaction.count}`)
          .join(", ")}`}
        accessibilityHint="Shows who reacted"
        hitSlop={6}
        onPress={onPress}
      >
        <GlassSurface
          isInteractive
          tintColorClassName={mine ? "accent-accent/25" : undefined}
          androidClassName="bg-black/55"
          className="h-7 flex-row items-center gap-0.5 rounded-full px-2"
        >
          {reactions.slice(0, 3).map((reaction) => (
            <Emoji key={reaction.emoji} emoji={reaction.emoji} size={14} />
          ))}
          {total > 1 && (
            <Text className="text-footnote ml-0.5 font-semibold text-white">
              {total}
            </Text>
          )}
        </GlassSurface>
      </Pressable>
    </Animated.View>
  );
}

/**
 * The carousel's scroll view. Swiping it scrolls the photos rather than
 * dragging the conversation over to show times (see `RevealTimes`).
 */
export function Strip({
  height,
  offsets,
  absolute = false,
  onCard,
  children,
}: {
  height: number;
  offsets: readonly number[];
  /** Over the room laid out for it, rather than in it. */
  absolute?: boolean;
  onCard?: (index: number) => void;
  children: ReactNode;
}) {
  const reveal = useRevealGesture();
  const native = Gesture.Native();
  if (reveal !== null) native.blocksExternalGesture(reveal);
  function onScroll(event: NativeSyntheticEvent<NativeScrollEvent>) {
    onCard?.(cardAt(offsets, event.nativeEvent.contentOffset.x));
  }
  return (
    <GestureDetector gesture={native}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        decelerationRate="fast"
        snapToOffsets={[...offsets]}
        disableIntervalMomentum
        scrollEventThrottle={32}
        onScroll={onCard === undefined ? undefined : onScroll}
        contentContainerStyle={{
          alignItems: "flex-start",
          gap: CARD_GAP,
          paddingRight: BLEED,
        }}
        style={[
          { height, marginRight: -BLEED },
          absolute && { left: 0, position: "absolute", right: 0, top: 0 },
        ]}
      >
        {children}
      </ScrollView>
    </GestureDetector>
  );
}

/** The chips of the card a swipe settled on, or an empty line for room. */
export function CurrentChips({
  item,
  reactions,
}: {
  item: MediaItem | undefined;
  reactions: CarouselReactionsOf;
}) {
  const own = item === undefined ? [] : reactions.on(item.part);
  return (
    <View style={{ minHeight: CHIP_LINE }}>
      {item !== undefined && own.length > 0 && (
        <ChipRow
          reactions={own}
          align="start"
          onToggle={(emoji) => reactions.toggle(item.part, emoji)}
          onHold={(emoji) => reactions.view(item.part, emoji)}
        />
      )}
    </View>
  );
}
