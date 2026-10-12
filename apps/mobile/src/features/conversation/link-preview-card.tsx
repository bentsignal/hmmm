import type { ComponentProps, ReactNode } from "react";
import type { View as NativeView } from "react-native";
import { useRef, useState } from "react";
import { Pressable, Text, View } from "react-native";
import Animated, { Easing, FadeIn, FadeOut } from "react-native-reanimated";
import * as WebBrowser from "expo-web-browser";

import type { MenuPress } from "./link-preview-media";
import type { CardFace, PlaceholderStage } from "./placeholder-timing";
import type { LinkCard, LinkPreview } from "./types";
import { SymbolIcon } from "~/components/symbol-icon";
import { CARD_WIDTH, ImageArea, VideoArea } from "./link-preview-media";
import { useMenuTarget } from "./message-actions";
import {
  cardFace,
  initialStage,
  minElapsed,
  resolveStage,
  startMinClock,
  startPendingClock,
} from "./placeholder-timing";

const EASE = Easing.inOut(Easing.cubic);
const FADE_MS = 260;
const SHOW = FadeIn.duration(FADE_MS).easing(EASE);
const HIDE = FadeOut.duration(200).easing(EASE);

/** "nytimes.com" for a link, without the "www.". */
function hostOf(link: string) {
  try {
    return new URL(link).hostname.replace(/^www\./, "");
  } catch {
    return link;
  }
}

function SiteName({ children }: { children: string }) {
  return (
    <Text numberOfLines={1} className="text-caption text-muted uppercase">
      {children}
    </Text>
  );
}

/**
 * While the preview loads: a card the size of a typical one, with the
 * link's site in place and gray where the image and title go.
 */
function Placeholder({ link }: { link: string }) {
  return (
    <View accessibilityLabel={`Loading preview of ${link}`}>
      <ImageArea />
      <View className="gap-1.5 px-3 py-2.5">
        <SiteName>{hostOf(link)}</SiteName>
        <View className="bg-fill h-3.5 w-52 rounded-full" />
        <View className="bg-fill h-3.5 w-36 rounded-full" />
      </View>
    </View>
  );
}

/** A link without a preview: its site and the link itself. */
function LinkOnly({ link }: { link: string }) {
  return (
    <View className="flex-row items-center gap-3 px-3 py-2.5">
      <View className="bg-fill size-9 items-center justify-center rounded-lg">
        <SymbolIcon
          name={{ android: "link", ios: "link" }}
          size={16}
          tintColorClassName="accent-muted"
        />
      </View>
      <View className="flex-1 gap-0.5">
        <Text
          numberOfLines={1}
          className="text-subhead text-foreground font-semibold"
        >
          {hostOf(link)}
        </Text>
        <Text numberOfLines={1} className="text-footnote text-muted">
          {link}
        </Text>
      </View>
    </View>
  );
}

/** Open Graph preview fetched by the server. */
function Preview({
  preview,
  press,
}: {
  preview: LinkPreview;
  /** The card's hold, for a video's own Pressable. */
  press?: MenuPress;
}) {
  const hasText =
    preview.siteName !== undefined ||
    preview.title !== undefined ||
    preview.description !== undefined;
  return (
    <View>
      {preview.video !== undefined ? (
        <VideoArea
          video={preview.video}
          poster={preview.imageUrl}
          press={press}
        />
      ) : (
        preview.imageUrl !== undefined && <ImageArea uri={preview.imageUrl} />
      )}
      {hasText && (
        <View className="gap-0.5 px-3 py-2.5">
          {preview.siteName !== undefined && (
            <SiteName>{preview.siteName}</SiteName>
          )}
          {preview.title !== undefined && (
            <Text
              numberOfLines={2}
              className="text-subhead text-foreground font-semibold"
            >
              {preview.title}
            </Text>
          )}
          {preview.description !== undefined && (
            <Text numberOfLines={2} className="text-footnote text-muted">
              {preview.description}
            </Text>
          )}
        </View>
      )}
    </View>
  );
}

/**
 * When a card shows its placeholder (see `placeholder-timing.ts`): it keeps
 * its space empty for a moment, so a preview that arrives fast fades
 * straight in, and a placeholder that does show stays long enough not to
 * flicker. `appear` starts the wait once the card is laid out.
 */
function usePlaceholderTiming(loaded: boolean) {
  const [stored, setStage] = useState<PlaceholderStage>(() =>
    initialStage(loaded),
  );
  const [pendingDue, setPendingDue] = useState(false);
  const started = useRef(false);
  const held = useRef(false);
  const stage = resolveStage({ loaded, pendingDue, stage: stored });
  if (stage !== stored) setStage(stage);
  return {
    face: cardFace(loaded, stage),
    /** The card was laid out: its wait starts. */
    appear: () => {
      if (started.current || stage !== "waiting") return;
      started.current = true;
      startPendingClock(() => setPendingDue(true));
    },
    /** The placeholder was laid out: its minimum time starts. */
    placeholderShown: () => {
      if (held.current) return;
      held.current = true;
      startMinClock(() => setStage(minElapsed));
    },
  };
}

/**
 * A card's frame: the size of what it holds, hidden, outline and all, while
 * its space is kept. It takes a new size at once rather than easing to it,
 * so the list moves the messages below with it: an eased frame drew over
 * the next message while it shrank, or while the list put that message
 * where the card's final size left room for.
 */
function CardFrame({
  face,
  style,
  onLayout,
  children,
}: {
  face: CardFace;
  /** The squeeze while the card is held. */
  style?: ComponentProps<typeof Animated.View>["style"];
  onLayout?: () => void;
  children: ReactNode;
}) {
  return (
    <Animated.View
      onLayout={onLayout}
      className="border-hairline border-separator bg-background-elevated overflow-hidden rounded-2xl"
      style={[
        {
          borderCurve: "continuous",
          opacity: face === "space" ? 0 : 1,
          transitionDuration: FADE_MS,
          transitionProperty: "opacity",
          transitionTimingFunction: "ease-in-out",
          width: CARD_WIDTH,
        },
        style,
      ]}
    >
      {children}
    </Animated.View>
  );
}

/** What a card shows, faded from what it showed before. */
function CardContents({
  card,
  face,
  press,
  onPlaceholderLayout,
}: {
  card: LinkCard;
  face: CardFace;
  press?: MenuPress;
  onPlaceholderLayout?: () => void;
}) {
  const { link, preview } = card;
  if (face === "space") {
    // The placeholder's space, kept empty while the preview may still
    // arrive in time to skip it.
    return (
      <View key="space" style={{ opacity: 0 }}>
        <Placeholder link={link} />
      </View>
    );
  }
  if (face === "placeholder" || preview === undefined) {
    return (
      <Animated.View
        key="loading"
        entering={SHOW}
        exiting={HIDE}
        onLayout={onPlaceholderLayout}
      >
        <Placeholder link={link} />
      </Animated.View>
    );
  }
  if (preview === null) {
    return (
      <Animated.View key="link" entering={SHOW}>
        <LinkOnly link={link} />
      </Animated.View>
    );
  }
  return (
    <Animated.View key="preview" entering={SHOW}>
      <Preview preview={preview} press={press} />
    </Animated.View>
  );
}

/**
 * One link's card. Until the preview arrives it holds a placeholder (after
 * a short wait), then the preview fades in as the card takes its size; a
 * link the server couldn't preview settles into a small card with just the
 * link. Tapping opens the link (or plays the post's video, on the video);
 * holding lifts just this card into the message's menu, about its link.
 */
function LinkCardView({ card }: { card: LinkCard }) {
  const { link, preview } = card;
  const url = preview?.url ?? link;
  const timing = usePlaceholderTiming(preview !== undefined);
  const ref = useRef<NativeView>(null);
  const target = useMenuTarget({
    link,
    measured: ref,
    preview: (
      <CardFrame face={timing.face}>
        <CardContents card={card} face={timing.face} />
      </CardFrame>
    ),
    // A card lifts as it is, never on another card.
    shape: "plain",
  });
  return (
    <CardFrame
      face={timing.face}
      style={target?.style}
      onLayout={timing.appear}
    >
      <Pressable
        ref={ref}
        accessibilityRole="link"
        accessibilityHint={link}
        onPress={() => void WebBrowser.openBrowserAsync(url)}
        {...target?.press}
        className="active:opacity-80"
      >
        <CardContents
          card={card}
          face={timing.face}
          // Outside a message (no menu), a video still plays.
          press={target?.press ?? {}}
          onPlaceholderLayout={timing.placeholderShown}
        />
      </Pressable>
    </CardFrame>
  );
}

/** A message's link cards, in the order of its links. */
export function LinkCards({ cards }: { cards: readonly LinkCard[] }) {
  return (
    <View className="gap-1">
      {cards.map((card) => (
        <LinkCardView key={card.link} card={card} />
      ))}
    </View>
  );
}
