import { useRef } from "react";
import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useVideoPlayer, VideoView } from "expo-video";

import { ViewerCloseButton } from "./viewer-close-button";

/**
 * A video in iOS's own full-screen player: its controls, its close
 * button beside AirPlay, and its swipe down to dismiss. The player opens
 * full screen as soon as the first frame is ready; leaving full screen
 * closes the viewer. The close button underneath only matters if the
 * video never loads.
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
  const opened = useRef(false);

  return (
    <View className="bg-black" style={StyleSheet.absoluteFill}>
      <VideoView
        ref={view}
        player={player}
        nativeControls
        allowsPictureInPicture
        fullscreenOptions={{ enable: true }}
        contentFit="contain"
        // The full-screen player draws the video; the inline one stays out
        // of sight behind it.
        style={{ flex: 1, opacity: 0 }}
        onFirstFrameRender={() => {
          if (opened.current) return;
          opened.current = true;
          void view.current?.enterFullscreen();
        }}
        onFullscreenExit={onClose}
      />
      <View className="absolute left-4" style={{ top: insets.top + 8 }}>
        <ViewerCloseButton onPress={onClose} />
      </View>
    </View>
  );
}
