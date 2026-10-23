import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, { useAnimatedStyle } from "react-native-reanimated";
import { Image } from "expo-image";

import type { Size } from "./photo-transform";
import type { Pager } from "./photo-viewer-state";
import { touchGesture } from "./photo-gestures";
import { dismissTransform } from "./photo-transform";
import {
  doubleTapGesture,
  fadeOf,
  fadeOut,
  useViewer,
} from "./photo-viewer-state";

/**
 * A full-screen photo you can pinch or double-tap to zoom, drag around once
 * zoomed, and swipe down to close. The black backdrop fades as the photo is
 * dragged away, showing the conversation behind it, like Photos.
 *
 * The viewer animates its own closing and calls `onClose` once it's done,
 * so its screen should close without an animation of its own.
 */
export function PhotoViewer({
  url,
  size,
  onClose,
  chrome,
  pager,
}: {
  url: string;
  /** The photo's pixel size, when the message knows it. */
  size?: Size;
  onClose: () => void;
  /**
   * Controls drawn over the photo; they fade out with the backdrop. `close`
   * fades the viewer out, then calls `onClose`.
   */
  chrome?: (close: () => void) => ReactNode;
  /** One of a group, swiped through sideways (see `MediaGroupViewer`). */
  pager?: Pager;
}) {
  const viewer = useViewer(size);
  const gesture = Gesture.Simultaneous(
    touchGesture(viewer, onClose, pager),
    doubleTapGesture(viewer),
  );

  function close() {
    fadeOut(viewer, onClose);
  }

  // Each style captures `viewer` itself: Reanimated updates a style for the
  // shared values its own function captures, not ones a helper reaches.
  const backdropStyle = useAnimatedStyle(() => ({ opacity: fadeOf(viewer) }));
  const chromeStyle = useAnimatedStyle(() => ({ opacity: fadeOf(viewer) }));
  const photoStyle = useAnimatedStyle(() => {
    // The swipe to close draws on top of the zoom.
    const drag = dismissTransform(
      { x: viewer.dragX.get(), y: viewer.dragY.get() },
      viewer.anchor.get(),
      viewer.frame.get().height,
    );
    return {
      opacity: viewer.fade.get(),
      transform: [
        { translateX: drag.x + drag.scale * viewer.x.get() },
        { translateY: drag.y + drag.scale * viewer.y.get() },
        { scale: drag.scale * viewer.scale.get() },
      ],
    };
  });

  return (
    <>
      <Animated.View
        className="bg-black"
        style={[StyleSheet.absoluteFill, backdropStyle]}
      />
      {/* Touches land on a frame that doesn't move, so their positions are
          in screen terms however the photo is zoomed. */}
      <GestureDetector gesture={gesture}>
        <View
          style={StyleSheet.absoluteFill}
          onLayout={(event) =>
            viewer.frame.set({
              height: event.nativeEvent.layout.height,
              width: event.nativeEvent.layout.width,
            })
          }
        >
          <Animated.View style={[StyleSheet.absoluteFill, photoStyle]}>
            <Image
              source={{ uri: url }}
              contentFit="contain"
              transition={150}
              onLoad={(event) =>
                viewer.photo.set({
                  height: event.source.height,
                  width: event.source.width,
                })
              }
              style={{ flex: 1 }}
            />
          </Animated.View>
        </View>
      </GestureDetector>
      <Animated.View
        pointerEvents="box-none"
        style={[StyleSheet.absoluteFill, chromeStyle]}
      >
        {chrome?.(close)}
      </Animated.View>
    </>
  );
}
