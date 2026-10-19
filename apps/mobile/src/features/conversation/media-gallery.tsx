import type { ReactNode } from "react";
import { createContext, use, useState } from "react";
import { Modal, Text, useWindowDimensions, View } from "react-native";
import Animated, { useAnimatedStyle } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import type { Message } from "./types";
import { CARD_GAP, cardHeight, PEEK } from "./gallery-layout";
import {
  GalleryBackdrop,
  GalleryCard,
  GalleryChips,
  GalleryReactionBar,
  useGalleryOpening,
  useGalleryPager,
  useOpenFullScreen,
} from "./gallery-parts";
import { mediaItems } from "./media-groups";
import { useMessageActions } from "./message-actions";

/** Opens a message's photos and videos, on the attachment at `index`. */
type OpenGallery = (messageId: string, index: number) => void;

const GalleryContext = createContext<OpenGallery | null>(null);

/**
 * Opens the focused view of a message's photos and videos. Null where
 * there's none (the lifted copy in the menu), where media opens alone.
 */
export function useOpenGallery() {
  return use(GalleryContext);
}

/**
 * The conversation's focused view of a message's photos and videos (see
 * `MediaGallery`), over the messages below. It follows the message as it
 * changes, so reactions picked there show at once.
 */
export function MediaGalleryProvider({
  messages,
  children,
}: {
  /** Every message the conversation shows, to find the open one in. */
  messages: readonly Message[];
  children: ReactNode;
}) {
  const [shown, setShown] = useState<{ messageId: string; index: number }>();
  const message =
    shown === undefined
      ? undefined
      : messages.find((candidate) => candidate.id === shown.messageId);
  return (
    <GalleryContext
      value={(messageId, index) => setShown({ index, messageId })}
    >
      {children}
      {shown !== undefined && message !== undefined && (
        <MediaGallery
          message={message}
          start={shown.index}
          onClosed={() => setShown(undefined)}
        />
      )}
    </GalleryContext>
  );
}

/**
 * A message's photos and videos, focused: the conversation blurs away
 * behind them, the one picked in the middle with its neighbors peeking out
 * on each side, and a swipe brings the next one over. Under it are its own
 * reactions, and the quick reactions to add one to it. Tapping a card
 * opens it full screen; tapping around them closes.
 */
function MediaGallery({
  message,
  start,
  onClosed,
}: {
  message: Message;
  /** The attachment it opened on. */
  start: number;
  onClosed: () => void;
}) {
  const openFullScreen = useOpenFullScreen();
  const screen = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { viewReactions } = useMessageActions();
  const items = mediaItems(message);
  const first = Math.max(
    0,
    items.findIndex((item) => item.index === start),
  );
  const cardWidth = Math.min(screen.width - (PEEK + CARD_GAP) * 2, 380);
  const stride = cardWidth + CARD_GAP;
  // As tall as the tallest card, so the count and reactions hug them.
  const laneHeight = Math.max(
    ...items.map((item) => cardHeight(item, cardWidth, screen.height * 0.56)),
  );
  const { close, closing, progress } = useGalleryOpening(onClosed);
  const { onScroll, scroll, slot } = useGalleryPager(
    items.length,
    first,
    stride,
  );
  const fade = useAnimatedStyle(() => ({ opacity: progress.get() }));
  const current = items[slot] ?? items[0];
  if (current === undefined) return null;
  return (
    <Modal
      transparent
      visible
      animationType="none"
      statusBarTranslucent
      onRequestClose={() => close()}
    >
      <GalleryBackdrop progress={progress} onPress={() => close()} />
      <View
        pointerEvents="box-none"
        className="absolute inset-0 justify-center"
        style={{ paddingBottom: insets.bottom, paddingTop: insets.top }}
      >
        <Animated.View style={fade} className="items-center pb-3">
          <Text className="text-subhead text-foreground font-semibold">
            {`${slot + 1} of ${items.length}`}
          </Text>
        </Animated.View>
        <Animated.FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          decelerationRate="fast"
          snapToInterval={stride}
          disableIntervalMomentum
          contentOffset={{ x: first * stride, y: 0 }}
          // Each card sits on the lane's floor, its reactions just under it.
          contentContainerStyle={{
            alignItems: "flex-end",
            gap: CARD_GAP,
            paddingHorizontal: (screen.width - cardWidth) / 2,
          }}
          style={{ flexGrow: 0, height: laneHeight }}
          onScroll={onScroll}
          scrollEventThrottle={16}
          data={items}
          keyExtractor={(item) => String(item.index)}
          renderItem={({ item, index }) => (
            <GalleryCard
              item={item}
              slot={index}
              width={cardWidth}
              height={cardHeight(item, cardWidth, laneHeight)}
              scroll={scroll}
              progress={progress}
              onPress={() => close(() => openFullScreen(item))}
            />
          )}
        />
        <GalleryChips
          message={message}
          item={current}
          width={cardWidth}
          hidden={closing}
          onHold={(emoji) =>
            close(() => viewReactions(message.id, current.part, emoji))
          }
        />
        <GalleryReactionBar
          message={message}
          item={current}
          closing={closing}
        />
      </View>
    </Modal>
  );
}
