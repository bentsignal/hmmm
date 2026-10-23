import { useState } from "react";
import { Pressable, StyleSheet, useWindowDimensions, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

import type { ViewerItem } from "./media-group";
import type { Pager } from "./photo-viewer-state";
import { PlayBadge } from "./attachment-view";
import { PhotoViewer } from "./photo-viewer";
import { ViewerCloseButton } from "./viewer-close-button";

function sizeOf(item: ViewerItem) {
  const { height = 0, width = 0 } = item;
  return width > 0 && height > 0 ? { height, width } : undefined;
}

/**
 * The close button over the shown photo, held still while its page
 * slides, and fading with it as it's swiped away.
 */
function CloseChrome({
  index,
  width,
  pager,
  onPress,
}: {
  index: number;
  width: number;
  pager: Pager;
  onPress: () => void;
}) {
  const insets = useSafeAreaInsets();
  const still = useAnimatedStyle(() => ({
    transform: [{ translateX: (pager.position.get() - index) * width }],
  }));
  return (
    <Animated.View
      pointerEvents="box-none"
      style={[StyleSheet.absoluteFill, still]}
    >
      <View className="absolute left-4" style={{ top: insets.top + 8 }}>
        <ViewerCloseButton onPress={onPress} />
      </View>
    </Animated.View>
  );
}

function PlayButton({ url }: { url: string }) {
  const router = useRouter();
  return (
    <View
      pointerEvents="box-none"
      className="absolute inset-0 items-center justify-center"
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Play video"
        onPress={() =>
          router.push({ params: { kind: "video", url }, pathname: "/media" })
        }
      >
        <PlayBadge />
      </Pressable>
    </View>
  );
}

function Page({
  item,
  index,
  width,
  pager,
  current,
  onClose,
}: {
  item: ViewerItem;
  index: number;
  width: number;
  pager: Pager;
  current: boolean;
  onClose: () => void;
}) {
  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: (index - pager.position.get()) * width }],
  }));
  const shown = item.kind === "video" ? item.poster : item.url;
  return (
    <Animated.View style={[StyleSheet.absoluteFill, style]}>
      <PhotoViewer
        url={shown ?? ""}
        size={sizeOf(item)}
        onClose={onClose}
        pager={pager}
        chrome={
          current
            ? (close) => (
                <CloseChrome
                  index={index}
                  width={width}
                  pager={pager}
                  onPress={close}
                />
              )
            : undefined
        }
      />
      {item.kind === "video" && <PlayButton url={item.url} />}
    </Animated.View>
  );
}

/**
 * A message's photos and videos, full screen, on the one tapped: swipe
 * sideways through the rest, pinch or double-tap to zoom, swipe down to
 * close. A video shows its poster with a play button, which opens it in
 * the video viewer. Like `PhotoViewer`, it animates its own closing, then
 * calls `onClose`.
 */
export function MediaGroupViewer({
  items,
  start,
  onClose,
}: {
  items: readonly ViewerItem[];
  start: number;
  onClose: () => void;
}) {
  const { width } = useWindowDimensions();
  const first = Math.min(Math.max(0, start), items.length - 1);
  const [index, setIndex] = useState(first);
  const position = useSharedValue(first);
  const pager = { count: items.length, onSettle: setIndex, position };
  // The shown page and its neighbors, so a swipe has the next one ready.
  const pages = [index - 1, index, index + 1].filter(
    (page) => page >= 0 && page < items.length,
  );
  return (
    <View style={StyleSheet.absoluteFill}>
      {pages.map((page) => {
        const item = items[page];
        return (
          item !== undefined && (
            <Page
              key={`${page}:${item.url}`}
              item={item}
              index={page}
              width={width}
              pager={pager}
              current={page === index}
              onClose={onClose}
            />
          )
        );
      })}
    </View>
  );
}
