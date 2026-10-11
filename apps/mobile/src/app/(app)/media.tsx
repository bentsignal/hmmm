import { Pressable, StyleSheet } from "react-native";
import Animated, {
  FadeIn,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { scheduleOnRN } from "react-native-worklets";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useVideoPlayer, VideoView } from "expo-video";

import { SymbolIcon } from "~/components/symbol-icon";
import { PhotoViewer } from "~/features/conversation/photo-viewer";

/** The route has no animation of its own; the screen fades itself in. */
const FADE_IN = FadeIn.duration(200);

function Video({ url, onClose }: { url: string; onClose: () => void }) {
  const player = useVideoPlayer(url, (instance) => instance.play());
  const opacity = useSharedValue(1);
  const style = useAnimatedStyle(() => ({ opacity: opacity.get() }));
  function close() {
    opacity.set(
      withTiming(0, { duration: 180 }, (finished) => {
        if (finished === true) scheduleOnRN(onClose);
      }),
    );
  }
  return (
    <Animated.View className="flex-1 bg-black" style={style}>
      <VideoView
        player={player}
        nativeControls
        allowsPictureInPicture
        contentFit="contain"
        style={{ flex: 1 }}
      />
      <CloseButton onPress={close} />
    </Animated.View>
  );
}

function CloseButton({ onPress }: { onPress: () => void }) {
  const insets = useSafeAreaInsets();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Close"
      onPress={onPress}
      className="absolute left-4 size-9 items-center justify-center rounded-full bg-black/50"
      style={{ top: insets.top + 8 }}
    >
      <SymbolIcon
        name={{ android: "close", ios: "xmark" }}
        size={16}
        tintColorClassName="accent-white"
      />
    </Pressable>
  );
}

/** The pixel size passed along with a photo, when its message had one. */
function photoSize(width?: string, height?: string) {
  const size = { height: Number(height), width: Number(width) };
  return size.width > 0 && size.height > 0 ? size : undefined;
}

/** Full-screen photo or video from a message. */
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
        <Video url={url} onClose={onClose} />
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
