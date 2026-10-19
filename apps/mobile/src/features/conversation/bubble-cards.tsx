import type { ReactNode } from "react";
import type { View as NativeView } from "react-native";
import { useRef } from "react";
import { Pressable, Text, View } from "react-native";
import Animated from "react-native-reanimated";
import { Image } from "expo-image";

import type { MediaItem } from "./media-groups";
import type { Message } from "./types";
import { DurationBadge, PlayBadge, usePoster } from "./attachment-view";
import { useOpenGallery } from "./media-gallery";
import { ReactionPartProvider, useMenuTarget } from "./message-actions";

// The cards bubbles' stacks of photos are drawn with (see `BubbleMediaStack`).

/** A photo or a video's poster, filling its card, blurred when `blur`. */
export function Poster({ item, blur = 0 }: { item: MediaItem; blur?: number }) {
  const poster = usePoster(item.attachment);
  if (poster === undefined) return null;
  return (
    <Image
      source={{ uri: poster }}
      contentFit="cover"
      transition={150}
      blurRadius={blur}
      style={{ height: "100%", position: "absolute", width: "100%" }}
    />
  );
}

/** A card of the pile: rounded, a photo, and a dimming wash behind. */
export function PileCard({
  item,
  width,
  height,
  blur,
  dim,
  front,
}: {
  item: MediaItem;
  width: number;
  height: number;
  blur: number;
  /** How much the card behind fades into the background, 0 to 1. */
  dim: number;
  front: boolean;
}) {
  const isVideo = item.attachment.kind === "video";
  return (
    <View
      className="bg-fill items-center justify-center overflow-hidden rounded-2xl"
      style={{ borderCurve: "continuous", height, width }}
    >
      <Poster item={item} blur={blur} />
      {dim > 0 && (
        <View
          className="bg-background absolute inset-0"
          style={{ opacity: dim }}
        />
      )}
      {front && isVideo && <PlayBadge />}
      {front && isVideo && item.attachment.durationMs !== undefined && (
        <DurationBadge durationMs={item.attachment.durationMs} />
      )}
    </View>
  );
}

/** How many there are, on the front card's corner. */
export function CountBadge({
  count,
  isOwn,
}: {
  count: number;
  isOwn: boolean;
}) {
  return (
    <View
      className={
        isOwn
          ? "absolute top-2 left-2 rounded-full bg-black/55 px-2 py-0.5"
          : "absolute top-2 right-2 rounded-full bg-black/55 px-2 py-0.5"
      }
    >
      <Text className="text-caption font-semibold text-white">{count}</Text>
    </View>
  );
}

/**
 * Holds open the menu for the card in front, with the reactions picked
 * there going to it; taps open the focused view on it. Null in the lifted
 * copy, which draws as is.
 */
export function StackPress({
  message,
  front,
  preview,
  children,
}: {
  message: Message;
  front: MediaItem;
  preview: ReactNode;
  children: ReactNode;
}) {
  return (
    <ReactionPartProvider part={front.part}>
      <StackTarget message={message} front={front} preview={preview}>
        {children}
      </StackTarget>
    </ReactionPartProvider>
  );
}

function StackTarget({
  message,
  front,
  preview,
  children,
}: {
  message: Message;
  front: MediaItem;
  preview: ReactNode;
  children: ReactNode;
}) {
  const ref = useRef<NativeView>(null);
  const openGallery = useOpenGallery();
  const target = useMenuTarget({
    attachment: front.attachment,
    measured: ref,
    preview,
    shape: "plain",
  });
  return (
    <Pressable
      ref={ref}
      {...target?.press}
      accessibilityRole="imagebutton"
      accessibilityLabel={`${message.attachments.length} photos and videos`}
      accessibilityHint="Opens them"
      onPress={() => openGallery?.(message.id, front.index)}
    >
      <Animated.View style={target?.style}>{children}</Animated.View>
    </Pressable>
  );
}
