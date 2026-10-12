import { Pressable, View } from "react-native";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { PREVIEW_IMAGE_USER_AGENT } from "@decentralized-convex/messages";

import type { useMenuTarget } from "./message-actions";
import type { LinkPreview } from "./types";
import { DurationBadge, PlayBadge } from "./attachment-view";

/** Every card is this wide, so swapping one for another never jumps. */
export const CARD_WIDTH = 256;
/** Open Graph images are 1.91:1. */
const IMAGE_HEIGHT = Math.round(CARD_WIDTH / 1.91);
/** A video keeps its shape, up to this tall. */
const MAX_VIDEO_HEIGHT = 320;

/** A held card's press handlers; none where it has no menu. */
export type MenuPress = Partial<
  NonNullable<ReturnType<typeof useMenuTarget>>["press"]
>;
type Video = NonNullable<LinkPreview["video"]>;

/**
 * Gray, where the image goes; images fade in over it. They load as a link
 * expander (`PREVIEW_IMAGE_USER_AGENT`), since sites such as Reddit serve
 * a generic image to anyone else.
 */
export function ImageArea({
  uri,
  height = IMAGE_HEIGHT,
}: {
  uri?: string;
  height?: number;
}) {
  return (
    <View className="bg-fill" style={{ height }}>
      {uri !== undefined && (
        <Image
          source={{ headers: { "User-Agent": PREVIEW_IMAGE_USER_AGENT }, uri }}
          contentFit="cover"
          transition={200}
          style={{ height, width: CARD_WIDTH }}
        />
      )}
    </View>
  );
}

function videoHeight({ height, width }: Video) {
  if (width === undefined || height === undefined || width === 0) {
    return IMAGE_HEIGHT;
  }
  return Math.min(MAX_VIDEO_HEIGHT, Math.round((CARD_WIDTH * height) / width));
}

/**
 * A post's video (a tweet's, say): its poster with a play button, which
 * plays it full screen like a sent video. `press` is the card's hold, so
 * holding the video still lifts the card; without it (the lifted copy) it
 * only shows.
 */
/** Plays a post's video full screen, like a sent video. */
export function usePlayVideo() {
  const router = useRouter();
  return (video: Video) =>
    router.push({
      params: { kind: "video", url: video.url },
      pathname: "/media",
    });
}

export function VideoArea({
  video,
  poster,
  press,
}: {
  video: Video;
  poster?: string;
  press?: MenuPress;
}) {
  const play = usePlayVideo();
  return (
    <Pressable
      // The card is one element to VoiceOver; it plays through the
      // card's "Play video" action.
      accessible={false}
      disabled={press === undefined}
      onPress={() => play(video)}
      {...press}
    >
      <ImageArea uri={poster} height={videoHeight(video)} />
      <View className="absolute inset-0 items-center justify-center">
        <PlayBadge />
      </View>
      {video.durationMs !== undefined && (
        <DurationBadge durationMs={video.durationMs} />
      )}
    </Pressable>
  );
}
