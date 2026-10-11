import { StyleSheet, View } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";

import { PhotoViewer } from "~/features/conversation/photo-viewer";
import { VideoViewer } from "~/features/conversation/video-viewer";
import { ViewerCloseButton } from "~/features/conversation/viewer-close-button";

/** The route has no animation of its own; the screen fades itself in. */
const FADE_IN = FadeIn.duration(200);

function CloseButton({ onPress }: { onPress: () => void }) {
  const insets = useSafeAreaInsets();
  return (
    <View className="absolute left-4" style={{ top: insets.top + 8 }}>
      <ViewerCloseButton onPress={onPress} />
    </View>
  );
}

/** The pixel size passed along with a photo, when its message had one. */
function photoSize(width?: string, height?: string) {
  const size = { height: Number(height), width: Number(width) };
  return size.width > 0 && size.height > 0 ? size : undefined;
}

/** Full-screen photo or video from a message or the composer. */
export default function MediaScreen() {
  const router = useRouter();
  const { kind, url, width, height } = useLocalSearchParams<{
    kind: string;
    url: string;
    width?: string;
    height?: string;
  }>();
  function onClose() {
    router.back();
  }
  return (
    <Animated.View entering={FADE_IN} style={StyleSheet.absoluteFill}>
      {kind === "video" ? (
        <VideoViewer url={url} onClose={onClose} />
      ) : (
        <PhotoViewer
          url={url}
          size={photoSize(width, height)}
          onClose={onClose}
          chrome={(close) => <CloseButton onPress={close} />}
        />
      )}
    </Animated.View>
  );
}
