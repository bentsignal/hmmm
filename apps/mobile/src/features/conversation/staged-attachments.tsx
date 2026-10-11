import { ActivityIndicator, Pressable, Text, View } from "react-native";
import Animated, {
  FadeIn,
  FadeOut,
  LinearTransition,
  useAnimatedStyle,
  withTiming,
  ZoomIn,
  ZoomOut,
} from "react-native-reanimated";
import { Image } from "expo-image";

import type { StagedFile } from "~/features/messaging/attachments";
import { SymbolIcon } from "~/components/symbol-icon";
import { formatBytes, formatDuration } from "~/lib/format";

const TILE = 64;
const GAP = 8;
/** The tiles plus the space above them. */
const STRIP_HEIGHT = TILE + GAP;

function RemoveButton({
  file,
  onPress,
}: {
  file: StagedFile;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Remove ${file.name}`}
      onPress={onPress}
      hitSlop={8}
      className="absolute top-1 right-1 size-[22px] items-center justify-center rounded-full bg-black/60 active:opacity-70"
    >
      <SymbolIcon
        name={{ android: "close", ios: "xmark" }}
        size={10}
        weight="bold"
        tintColorClassName="accent-white"
      />
    </Pressable>
  );
}

function MediaTile({ file }: { file: StagedFile }) {
  const preview = file.kind === "video" ? file.poster?.uri : file.uri;
  return (
    <View
      className="bg-fill overflow-hidden rounded-xl"
      style={{ borderCurve: "continuous", height: TILE, width: TILE }}
    >
      {preview !== undefined && (
        <Image
          source={{ uri: preview }}
          contentFit="cover"
          style={{ height: "100%", width: "100%" }}
        />
      )}
      {file.kind === "video" && (
        <View className="absolute bottom-1 left-1 flex-row items-center gap-0.5 rounded-full bg-black/55 px-1.5 py-px">
          <SymbolIcon
            name={{ android: "videocam", ios: "video.fill" }}
            size={9}
            tintColorClassName="accent-white"
          />
          {file.durationMs !== undefined && (
            <Text className="text-[11px] font-semibold text-white">
              {formatDuration(Math.round(file.durationMs / 1000))}
            </Text>
          )}
        </View>
      )}
    </View>
  );
}

function FileTile({ file }: { file: StagedFile }) {
  return (
    <View
      className="bg-fill flex-row items-center gap-2 rounded-xl pr-8 pl-2.5"
      style={{ borderCurve: "continuous", height: TILE, width: 176 }}
    >
      <View className="bg-accent size-9 items-center justify-center rounded-lg">
        <SymbolIcon
          name={{ android: "description", ios: "doc.fill" }}
          size={17}
          tintColorClassName="accent-on-accent"
        />
      </View>
      <View className="flex-1">
        <Text
          numberOfLines={1}
          className="text-footnote text-foreground font-semibold"
        >
          {file.name}
        </Text>
        <Text className="text-caption text-muted">
          {formatBytes(file.size)}
        </Text>
      </View>
    </View>
  );
}

function StagedTile({
  file,
  onRemove,
}: {
  file: StagedFile;
  onRemove: () => void;
}) {
  return (
    <Animated.View
      entering={ZoomIn.duration(200).withInitialValues({
        transform: [{ scale: 0.6 }],
      })}
      exiting={ZoomOut.duration(160)}
    >
      <Animated.View
        entering={FadeIn.duration(160)}
        exiting={FadeOut.duration(120)}
      >
        {file.kind === "file" ? (
          <FileTile file={file} />
        ) : (
          <MediaTile file={file} />
        )}
        <RemoveButton file={file} onPress={onRemove} />
      </Animated.View>
    </Animated.View>
  );
}

/**
 * Holds a place while a picker hands over what was picked. iOS turns HEVC
 * videos into H.264 first, which takes a few seconds for a long video.
 */
function PreparingTile() {
  return (
    <Animated.View
      entering={FadeIn.duration(160)}
      exiting={FadeOut.duration(120)}
      accessibilityLabel="Adding attachments"
      className="bg-fill items-center justify-center rounded-xl"
      style={{ borderCurve: "continuous", height: TILE, width: TILE }}
    >
      <ActivityIndicator />
    </Animated.View>
  );
}

/**
 * What's attached to the message being written, above its text: photo and
 * video thumbnails and file chips, each with a remove button. It opens and
 * closes with its first and last item.
 */
export function StagedAttachments({
  files,
  preparing,
  onRemove,
}: {
  files: readonly StagedFile[];
  /** A picker is open or still handing over files. */
  preparing: boolean;
  onRemove: (id: string) => void;
}) {
  // Counting tiles, not just open or closed, restarts the animation when
  // files arrive. On Android the picker pauses the app while the strip
  // starts opening for the placeholder, and that first animation can stall.
  const tiles = files.length + (preparing ? 1 : 0);
  const style = useAnimatedStyle(() => ({
    height: withTiming(tiles > 0 ? STRIP_HEIGHT : 0, { duration: 220 }),
    opacity: withTiming(tiles > 0 ? 1 : 0, { duration: 180 }),
  }));
  return (
    <Animated.View style={[{ overflow: "hidden" }, style]}>
      <Animated.FlatList
        horizontal
        data={files}
        keyExtractor={(file) => file.id}
        renderItem={({ item }) => (
          <StagedTile file={item} onRemove={() => onRemove(item.id)} />
        )}
        ListFooterComponent={preparing ? <PreparingTile /> : null}
        itemLayoutAnimation={LinearTransition.duration(200)}
        showsHorizontalScrollIndicator={false}
        keyboardShouldPersistTaps="always"
        contentContainerStyle={{
          gap: GAP,
          paddingHorizontal: GAP,
          paddingTop: GAP,
        }}
      />
    </Animated.View>
  );
}
