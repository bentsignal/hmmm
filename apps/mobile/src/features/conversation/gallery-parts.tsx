import type { SharedValue } from "react-native-reanimated";
import { useState } from "react";
import { Platform, Pressable, View } from "react-native";
import Animated, {
  Easing,
  interpolate,
  useAnimatedReaction,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import { Image } from "expo-image";
import { useRouter } from "expo-router";

import type { MediaItem } from "./media-groups";
import type { Message } from "./types";
import { GlassSurface } from "~/components/glass-surface";
import { QUICK_REACTIONS, reactionsOn } from "~/features/messaging/reactions";
import { selectionTick } from "~/lib/native-extras";
import { PlayBadge, usePoster } from "./attachment-view";
import { CARD_GAP } from "./gallery-layout";
import { EmojiButton } from "./glass-menu-parts";
import { Backdrop } from "./glass-message-menu";
import { useMessageActions } from "./message-actions";
import { ChipRow } from "./reaction-chips";

// The pieces of the focused view of a message's photos (`MediaGallery`).

const OPEN_SPRING = { damping: 20, mass: 0.9, stiffness: 220 };
const CLOSE_MS = 220;
/** Neighbors sit back a little, dimmer, until swiped to the middle. */
const NEIGHBOR_SCALE = 0.9;
const NEIGHBOR_OPACITY = 0.55;
/** The reactions' line under the cards, kept even with none. */
export const CHIP_LANE = 34;

export function GalleryCard({
  item,
  slot,
  width,
  height,
  scroll,
  progress,
  onPress,
}: {
  item: MediaItem;
  /** Its place among the cards. */
  slot: number;
  width: number;
  height: number;
  scroll: SharedValue<number>;
  progress: SharedValue<number>;
  onPress: () => void;
}) {
  const poster = usePoster(item.attachment);
  const stride = width + CARD_GAP;
  const style = useAnimatedStyle(() => {
    const away = Math.min(1, Math.abs(scroll.get() / stride - slot));
    const open = progress.get();
    return {
      opacity: interpolate(away, [0, 1], [1, NEIGHBOR_OPACITY]) * open,
      transform: [
        {
          scale:
            interpolate(away, [0, 1], [1, NEIGHBOR_SCALE]) *
            interpolate(open, [0, 1], [0.92, 1]),
        },
      ],
    };
  });
  const isVideo = item.attachment.kind === "video";
  return (
    <View style={{ width }} className="items-center justify-end">
      <Pressable
        accessibilityRole="imagebutton"
        accessibilityLabel={isVideo ? "Play video" : "View photo"}
        onPress={onPress}
      >
        <Animated.View
          className="bg-fill items-center justify-center overflow-hidden rounded-3xl"
          style={[{ borderCurve: "continuous", height, width }, style]}
        >
          {poster !== undefined && (
            <Image
              source={{ uri: poster }}
              contentFit="cover"
              transition={150}
              style={{ height: "100%", position: "absolute", width: "100%" }}
            />
          )}
          {isVideo && <PlayBadge />}
        </Animated.View>
      </Pressable>
    </View>
  );
}

/**
 * The quick reactions, under the cards: each adds or takes back that
 * reaction on the card in the middle, and the view stays open.
 */
export function GalleryReactionBar({
  message,
  item,
  closing,
}: {
  message: Message;
  item: MediaItem;
  closing: boolean;
}) {
  const { toggleReaction } = useMessageActions();
  const reactions = reactionsOn(message.reactions, item.part);
  return (
    <View pointerEvents="box-none" className="items-center pt-6">
      <GlassSurface
        isInteractive
        materialize
        shown={!closing}
        className="flex-row items-center rounded-full px-1.5 py-1"
        androidClassName="bg-background-elevated"
      >
        {QUICK_REACTIONS.map((emoji) => (
          <EmojiButton
            key={emoji}
            emoji={emoji}
            mine={reactions.some(
              (reaction) => reaction.emoji === emoji && reaction.mine,
            )}
            onPress={() => {
              selectionTick();
              toggleReaction(message.id, emoji, item.part);
            }}
          />
        ))}
      </GlassSurface>
    </View>
  );
}

/**
 * The focused view springing open, and fading back out on `close`, which
 * calls `onClosed` (and `then`, for what it closed to do) once it's gone.
 */
export function useGalleryOpening(onClosed: () => void) {
  const [closing, setClosing] = useState(false);
  const progress = useSharedValue(0);
  useAnimatedReaction(
    () => true,
    (_, previous) => {
      if (previous === null) progress.set(withSpring(1, OPEN_SPRING));
    },
  );
  function close(then?: () => void) {
    if (closing) return;
    setClosing(true);
    function closed() {
      onClosed();
      then?.();
    }
    progress.set(
      withTiming(
        0,
        { duration: CLOSE_MS, easing: Easing.out(Easing.cubic) },
        (finished) => {
          if (finished === true) scheduleOnRN(closed);
        },
      ),
    );
  }
  return { close, closing, progress };
}

/**
 * Where the cards are scrolled to, and which is in the middle: the one
 * past halfway there, whose reactions show.
 */
export function useGalleryPager(count: number, first: number, stride: number) {
  const [slot, setSlot] = useState(first);
  const scroll = useSharedValue(first * stride);
  const onScroll = useAnimatedScrollHandler((event) => {
    scroll.set(event.contentOffset.x);
  });
  useAnimatedReaction(
    () => Math.min(count - 1, Math.max(0, Math.round(scroll.get() / stride))),
    (now, before) => {
      if (before !== null && now !== before) scheduleOnRN(setSlot, now);
    },
    [count, stride],
  );
  return { onScroll, scroll, slot };
}

/**
 * The middle card's reactions, under the cards: tap one to add or take
 * back that reaction, hold it to see who reacted (which closes the view
 * for the sheet).
 */
export function GalleryChips({
  message,
  item,
  width,
  hidden,
  onHold,
}: {
  message: Message;
  item: MediaItem;
  width: number;
  hidden: boolean;
  onHold: (emoji: string) => void;
}) {
  const { toggleReaction } = useMessageActions();
  const reactions = reactionsOn(message.reactions, item.part);
  return (
    <View
      pointerEvents="box-none"
      className="items-center pt-3"
      style={{ minHeight: CHIP_LANE }}
    >
      {!hidden && reactions.length > 0 && (
        <View style={{ maxWidth: width }}>
          <ChipRow
            reactions={reactions}
            align="start"
            onToggle={(emoji) => {
              selectionTick();
              toggleReaction(message.id, emoji, item.part);
            }}
            onHold={onHold}
          />
        </View>
      )}
    </View>
  );
}

/** Opens a photo or video full screen, to zoom or play it. */
export function useOpenFullScreen() {
  const router = useRouter();
  return ({ attachment }: MediaItem) =>
    router.push({
      params: {
        height: attachment.height,
        kind: attachment.kind,
        url: attachment.localUrl ?? attachment.url,
        width: attachment.width,
      },
      pathname: "/media",
    });
}

/**
 * The conversation behind the focused view, blurred and dimmed as behind
 * the menu. Android has no blur, so a wash keeps the photos apart from it.
 */
export function GalleryBackdrop({
  progress,
  onPress,
}: {
  progress: SharedValue<number>;
  onPress: () => void;
}) {
  const fade = useAnimatedStyle(() => ({ opacity: progress.get() }));
  return (
    <>
      <Backdrop progress={progress} onPress={onPress} />
      {Platform.OS === "android" && (
        <Animated.View
          pointerEvents="none"
          className="bg-background/85 absolute inset-0"
          style={fade}
        />
      )}
    </>
  );
}
