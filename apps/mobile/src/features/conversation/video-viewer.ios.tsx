import type { RefObject } from "react";
import { useRef } from "react";
import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useEventListener } from "expo";
import { useVideoPlayer, VideoView } from "expo-video";

import { ViewerCloseButton } from "./viewer-close-button";

/** How many times, and how far apart, to ask for full screen. */
const OPEN_ATTEMPTS = 6;
const RETRY_MS = 350;

/** Asks for full screen until it opens or the attempts run out. */
function keepOpening(
  view: RefObject<VideoView | null>,
  entered: RefObject<boolean>,
  left: number,
) {
  if (entered.current || left <= 0) return;
  void view.current?.enterFullscreen().catch(() => null);
  setTimeout(() => keepOpening(view, entered, left - 1), RETRY_MS);
}

/**
 * A video in iOS's own full-screen player: its controls, its close button
 * beside AirPlay, and its swipe down to dismiss. Leaving full screen closes
 * the viewer.
 *
 * iOS won't present full screen while another presentation is still
 * running (this screen appearing, say), so it asks when the video is
 * ready, after layout, and on the first frame, and keeps asking a few
 * times until `onFullscreenEnter` confirms. Until then a black cover hides
 * the inline player and its controls; the close button on it only matters
 * if the video never opens.
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
  const view = useRef<VideoView>(null);
  const entered = useRef(false);
  const started = useRef(false);

  // The first trigger starts the attempts; later ones find them running.
  function open() {
    if (started.current) return;
    started.current = true;
    keepOpening(view, entered, OPEN_ATTEMPTS);
  }

  useEventListener(player, "statusChange", ({ status }) => {
    if (status === "readyToPlay") open();
  });

  return (
    <View className="bg-black" style={StyleSheet.absoluteFill}>
      <VideoView
        ref={view}
        player={player}
        nativeControls
        allowsPictureInPicture
        fullscreenOptions={{ enable: true }}
        contentFit="contain"
        style={{ flex: 1 }}
        onLayout={() => setTimeout(open, RETRY_MS)}
        onFirstFrameRender={open}
        onFullscreenEnter={() => {
          entered.current = true;
        }}
        onFullscreenExit={onClose}
      />
      <View
        pointerEvents="box-none"
        className="bg-black"
        style={StyleSheet.absoluteFill}
      >
        <View className="absolute left-4" style={{ top: insets.top + 8 }}>
          <ViewerCloseButton onPress={onClose} />
        </View>
      </View>
    </View>
  );
}
