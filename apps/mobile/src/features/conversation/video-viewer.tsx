import type { SharedValue } from "react-native-reanimated";
import { Platform, StyleSheet, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { scheduleOnRN } from "react-native-worklets";
import { useVideoPlayer, VideoView } from "expo-video";

import {
  dismissProgress,
  dismissTransform,
  exitDuration,
  shouldDismiss,
} from "./photo-transform";
import { ViewerCloseButton } from "./viewer-close-button";

/** Room above the player for the close button, below the status bar. */
const TOP_BAR = 64;
const SETTLE_SPRING = { dampingRatio: 1, duration: 350 } as const;

/**
 * Dragging the video down: it follows the finger and, let go far enough
 * down or flicked, carries on off the screen before `onClose`.
 */
function dragToClose(
  {
    closing,
    dragY,
    frameHeight,
  }: {
    closing: SharedValue<boolean>;
    dragY: SharedValue<number>;
    frameHeight: SharedValue<number>;
  },
  onClose: () => void,
) {
  return (
    Gesture.Pan()
      .maxPointers(1)
      // Down only; a sideways move is the player's (scrubbing, volume).
      .activeOffsetY(20)
      .failOffsetX([-20, 20])
      .onUpdate((event) => {
        if (!closing.get()) dragY.set(Math.max(0, event.translationY));
      })
      .onEnd((event) => {
        if (closing.get()) return;
        const y = dragY.get();
        if (!shouldDismiss(y, event.velocityY)) {
          dragY.set(
            withSpring(0, { ...SETTLE_SPRING, velocity: event.velocityY }),
          );
          return;
        }
        closing.set(true);
        const exit = frameHeight.get() * 1.2;
        const duration = exitDuration(
          exit - y,
          Math.max(event.velocityY, 1500),
        );
        dragY.set(
          withTiming(
            exit,
            { duration, easing: Easing.out(Easing.quad) },
            (finished) => {
              if (finished === true) scheduleOnRN(onClose);
            },
          ),
        );
      })
  );
}

/**
 * A full-screen video with the platform's own player controls. The close
 * button sits in a bar above the player, so it never covers the player's
 * controls. Dragging down closes it, like a photo; the drag only starts on
 * a vertical move, so scrubbing and the player's buttons still work.
 *
 * Like `PhotoViewer`, it animates its own closing and then calls
 * `onClose`.
 */
export function VideoViewer({
  url,
  onClose,
}: {
  url: string;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  const player = useVideoPlayer(url, (instance) => instance.play());
  const frameHeight = useSharedValue(0);
  const dragY = useSharedValue(0);
  const fade = useSharedValue(1);
  const closing = useSharedValue(false);

  const drag = dragToClose({ closing, dragY, frameHeight }, onClose);

  function close() {
    if (closing.get()) return;
    closing.set(true);
    fade.set(
      withTiming(0, { duration: 180 }, (finished) => {
        if (finished === true) scheduleOnRN(onClose);
      }),
    );
  }

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: fade.get() * (1 - dismissProgress(dragY.get(), frameHeight.get())),
  }));
  const chromeStyle = useAnimatedStyle(() => ({
    opacity: fade.get() * (1 - dismissProgress(dragY.get(), frameHeight.get())),
  }));
  const videoStyle = useAnimatedStyle(() => {
    const shift = dismissTransform(
      { x: 0, y: dragY.get() },
      { x: 0, y: 0 },
      frameHeight.get(),
    );
    return {
      opacity: fade.get(),
      transform: [{ translateY: shift.y }, { scale: shift.scale }],
    };
  });

  return (
    <>
      <Animated.View
        className="bg-black"
        style={[StyleSheet.absoluteFill, backdropStyle]}
      />
      <GestureDetector gesture={drag}>
        <View
          style={[
            StyleSheet.absoluteFill,
            { paddingTop: insets.top + TOP_BAR },
          ]}
          onLayout={(event) => frameHeight.set(event.nativeEvent.layout.height)}
        >
          <Animated.View style={[{ flex: 1 }, videoStyle]}>
            <VideoView
              player={player}
              nativeControls
              allowsPictureInPicture
              contentFit="contain"
              // A TextureView moves and fades with the drag; Android's
              // default SurfaceView draws apart from the views around it.
              surfaceType={
                Platform.OS === "android" ? "textureView" : undefined
              }
              style={{ flex: 1 }}
            />
          </Animated.View>
        </View>
      </GestureDetector>
      <Animated.View
        pointerEvents="box-none"
        className="absolute left-4"
        style={[{ top: insets.top + 8 }, chromeStyle]}
      >
        <ViewerCloseButton onPress={close} />
      </Animated.View>
    </>
  );
}
