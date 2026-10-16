import { Text, View } from "react-native";
import Animated, {
  FadeIn,
  LayoutAnimationConfig,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

import { GlassSurface } from "~/components/glass-surface";
import { BUTTON, GlassCircleButton, TopEdge } from "./conversation-header";

/**
 * Height of the thread's header below the status bar. Replies rest below
 * it and scroll up behind it.
 */
export const THREAD_HEADER_HEIGHT = BUTTON + 8;

/**
 * A thread's header: a floating glass back button, "Thread" over the
 * conversation's name in the middle, and the thread's bell, which turns
 * its notifications off or back on.
 */
export function ThreadHeader({
  title,
  following,
  onToggleFollowing,
}: {
  /** The conversation's name. */
  title: string;
  /** Whether the bell is on; undefined until it has loaded. */
  following: boolean | undefined;
  onToggleFollowing: () => void;
}) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  return (
    <>
      <TopEdge height={THREAD_HEADER_HEIGHT} />
      <LayoutAnimationConfig skipEntering>
        <View
          // Drags between the buttons still scroll the replies beneath.
          pointerEvents="box-none"
          className="absolute right-0 left-0 flex-row items-center justify-between px-4"
          style={{ top: insets.top }}
        >
          <GlassCircleButton
            icon={{ android: "arrow_back", ios: "chevron.left" }}
            label="Back"
            onPress={() => {
              if (router.canGoBack()) router.back();
              else router.replace("/");
            }}
          />
          <GlassSurface
            className="items-center justify-center rounded-full px-4"
            style={{ height: BUTTON, maxWidth: 220 }}
          >
            <Text className="text-subhead text-foreground font-semibold">
              Thread
            </Text>
            {title !== "" && (
              <Animated.Text
                entering={FadeIn.duration(200)}
                numberOfLines={1}
                className="text-caption text-muted"
              >
                {title}
              </Animated.Text>
            )}
          </GlassSurface>
          <View style={{ width: BUTTON }}>
            {/* Once loaded, its glass materializes. */}
            {following !== undefined && (
              <GlassCircleButton
                  materialize
                  icon={
                    following
                      ? { android: "notifications", ios: "bell" }
                      : { android: "notifications_off", ios: "bell.slash" }
                  }
                  label={
                    following
                      ? "Turn Off Notifications for This Thread"
                      : "Turn On Notifications for This Thread"
                  }
                  onPress={onToggleFollowing}
                />
            )}
          </View>
        </View>
      </LayoutAnimationConfig>
    </>
  );
}
