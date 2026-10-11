import { Pressable, Text, View } from "react-native";
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  LinearTransition,
} from "react-native-reanimated";
import { Image } from "expo-image";
import * as WebBrowser from "expo-web-browser";

import type { LinkCard, LinkPreview } from "./types";
import { SymbolIcon } from "~/components/symbol-icon";
import { LONG_PRESS_MS, useMessagePress } from "./message-actions";

/** Every card is this wide, so swapping one for another never jumps. */
const CARD_WIDTH = 256;
/** Open Graph images are 1.91:1. */
const IMAGE_HEIGHT = Math.round(CARD_WIDTH / 1.91);

const EASE = Easing.inOut(Easing.cubic);
/** A card that changes size (placeholder to card) eases to the new one. */
const RESIZE = LinearTransition.duration(300).easing(EASE);
const SHOW = FadeIn.duration(260).easing(EASE);
const HIDE = FadeOut.duration(200).easing(EASE);

/** "nytimes.com" for a link, without the "www.". */
function hostOf(link: string) {
  try {
    return new URL(link).hostname.replace(/^www\./, "");
  } catch {
    return link;
  }
}

/** Gray, where the image goes; images fade in over it. */
function ImageArea({ uri }: { uri?: string }) {
  return (
    <View className="bg-fill" style={{ height: IMAGE_HEIGHT }}>
      {uri !== undefined && (
        <Image
          source={{ uri }}
          contentFit="cover"
          transition={200}
          style={{ height: IMAGE_HEIGHT, width: CARD_WIDTH }}
        />
      )}
    </View>
  );
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
function Preview({ preview }: { preview: LinkPreview }) {
  const hasText =
    preview.siteName !== undefined ||
    preview.title !== undefined ||
    preview.description !== undefined;
  return (
    <View>
      {preview.imageUrl !== undefined && <ImageArea uri={preview.imageUrl} />}
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
 * One link's card. It holds a placeholder until the preview arrives, then
 * the preview fades in as the card eases to its size; a link the server
 * couldn't preview settles into a small card with just the link. Tapping
 * opens the link; holding opens the message's menu about it.
 */
function LinkCardView({ card }: { card: LinkCard }) {
  const press = useMessagePress();
  const { link, preview } = card;
  const url = preview?.url ?? link;
  return (
    <Animated.View
      layout={RESIZE}
      className="border-hairline border-separator bg-background-elevated overflow-hidden rounded-2xl"
      style={{ borderCurve: "continuous", width: CARD_WIDTH }}
    >
      <Pressable
        accessibilityRole="link"
        accessibilityHint={link}
        delayLongPress={LONG_PRESS_MS}
        onPress={() => void WebBrowser.openBrowserAsync(url)}
        onPressIn={press?.pressIn}
        onPressOut={press?.pressOut}
        onLongPress={() => press?.longPress(link)}
        className="active:opacity-80"
      >
        {preview === undefined ? (
          <Animated.View key="loading" exiting={HIDE}>
            <Placeholder link={link} />
          </Animated.View>
        ) : preview === null ? (
          <Animated.View key="link" entering={SHOW}>
            <LinkOnly link={link} />
          </Animated.View>
        ) : (
          <Animated.View key="preview" entering={SHOW}>
            <Preview preview={preview} />
          </Animated.View>
        )}
      </Pressable>
    </Animated.View>
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
