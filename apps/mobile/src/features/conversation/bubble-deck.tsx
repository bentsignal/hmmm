import { useState } from "react";
import { View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";

import type { MediaItem } from "./media-groups";
import type { Message } from "./types";
import { selectionTick } from "~/lib/native-extras";
import { PileCard, StackPress } from "./bubble-cards";
import { CARD_WIDTH, cardHeight } from "./bubble-layout";
import { useRevealGesture } from "./reveal";

const SWIPE_AWAY = 70;
const SPRING = { damping: 18, stiffness: 240 };

/** Which card a swipe deck is on, as dots under it. */
function Dots({ count, at }: { count: number; at: number }) {
  return (
    <View className="flex-row justify-center gap-1 pt-1.5">
      {Array.from({ length: count }, (_, index) => (
        <View
          key={index}
          className={
            index === at
              ? "bg-foreground size-1.5 rounded-full"
              : "bg-muted/40 size-1.5 rounded-full"
          }
        />
      ))}
    </View>
  );
}

/**
 * The deck's swipe: the front card follows the finger, tilting as it
 * goes, and past `SWIPE_AWAY` flies off and `onThrown` brings the next
 * one forward, which rises into place as the front one leaves.
 */
function useDeckSwipe(onThrown: () => void) {
  const drag = useSharedValue(0);
  const reveal = useRevealGesture();
  function thrown() {
    onThrown();
    drag.set(0);
  }
  const pan = Gesture.Pan()
    .activeOffsetX([-10, 10])
    .failOffsetY([-12, 12])
    .onUpdate((event) => {
      drag.set(event.translationX);
    })
    .onEnd((event) => {
      if (Math.abs(event.translationX) < SWIPE_AWAY) {
        drag.set(withSpring(0, SPRING));
        return;
      }
      const away = Math.sign(event.translationX) * (CARD_WIDTH + 40);
      drag.set(
        withTiming(away, { duration: 160 }, (done) => {
          if (done === true) scheduleOnRN(thrown);
        }),
      );
    });
  // Swiping the deck isn't dragging the conversation to show times.
  if (reveal !== null) pan.blocksExternalGesture(reveal);
  const front = useAnimatedStyle(() => ({
    transform: [
      { translateX: drag.get() },
      { rotate: `${interpolate(drag.get(), [-200, 200], [-12, 12])}deg` },
    ],
  }));
  const next = useAnimatedStyle(() => {
    const gone = Math.min(1, Math.abs(drag.get()) / (CARD_WIDTH + 40));
    return {
      opacity: interpolate(gone, [0, 1], [0.7, 1]),
      transform: [
        { translateY: interpolate(gone, [0, 1], [-10, 0]) },
        { scale: interpolate(gone, [0, 1], [0.94, 1]) },
      ],
    };
  });
  return { front, next, pan };
}

function FrontCard({ item, height }: { item: MediaItem; height: number }) {
  return (
    <PileCard
      item={item}
      width={CARD_WIDTH}
      height={height}
      blur={0}
      dim={0}
      front
    />
  );
}

/**
 * `deck`: a pile you flick through where it is. Swiping the front card
 * either way throws it to the back and brings the next one forward;
 * tapping opens the focused view on the one in front.
 */
export function Deck({
  message,
  items,
  isOwn,
}: {
  message: Message;
  items: readonly MediaItem[];
  isOwn: boolean;
}) {
  const [at, setAt] = useState(0);
  const swipe = useDeckSwipe(() => {
    selectionTick();
    setAt((index) => (index + 1) % items.length);
  });
  const front = items[at] ?? items[0];
  if (front === undefined) return null;
  const following = items[(at + 1) % items.length] ?? front;
  const height = Math.max(...items.map((item) => cardHeight(item.attachment)));
  return (
    <View style={{ width: CARD_WIDTH }}>
      <StackPress
        message={message}
        front={front}
        preview={<FrontCard item={front} height={height} />}
      >
        <GestureDetector gesture={swipe.pan}>
          <View style={{ height: height + 10, width: CARD_WIDTH }}>
            <Animated.View className="absolute top-2.5" style={swipe.next}>
              <PileCard
                item={following}
                width={CARD_WIDTH}
                height={height}
                blur={4}
                dim={0.15}
                front={false}
              />
            </Animated.View>
            <Animated.View className="absolute top-2.5" style={swipe.front}>
              <FrontCard item={front} height={height} />
            </Animated.View>
          </View>
        </GestureDetector>
      </StackPress>
      <View className={isOwn ? "items-end" : "items-start"}>
        <View style={{ width: CARD_WIDTH }}>
          <Dots count={items.length} at={at} />
        </View>
      </View>
    </View>
  );
}
