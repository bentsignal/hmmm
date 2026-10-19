import type { ReactNode } from "react";
import { Platform, Pressable, Text } from "react-native";
import { textParts } from "@decentralized-convex/messages";

import type { Mention } from "./types";
import { useAccount } from "~/features/messaging/account";
import { useOpenProfile } from "~/features/profile/use-open-profile";
import { cn } from "~/lib/cn";
import { openLink } from "~/lib/open-link";
import { linkTapped } from "./link-tap";
import { mentionRanges } from "./mention-text";
import { EDITED, EditedSuffix } from "./message-changes";
import { useMenuPress } from "./row-touch";

/**
 * A link in the text: underlined, and holding it still opens the menu.
 * Tapping it opens the link, not the message's thread.
 */
function Link({ text, url }: { text: string; url: string }) {
  const press = useMenuPress();
  return (
    <Text
      accessibilityRole="link"
      onPress={() => {
        linkTapped();
        openLink(url);
      }}
      onLongPress={press?.onLongPress}
      onPressIn={press?.onPressIn}
      onPressOut={press?.onPressOut}
      className="underline"
    >
      {text}
    </Text>
  );
}

/**
 * How a mention chip fits its line. Sitting in a line of text, a view
 * rests on the baseline, and one taller than the font's ascent opens the
 * line up, so the chip stays about that tall and drops until its name's
 * baseline meets the line's. Each platform clips the name to the chip, so
 * on iOS the name's own line is that short too, and on Android, which
 * draws text taller, the chip is a little taller instead.
 */
const CHIP_FIT = Platform.select({
  android: {
    chip: { height: 20, transform: [{ translateY: 3.75 }] },
    name: { includeFontPadding: false },
  },
  default: {
    chip: { transform: [{ translateY: 2.5 }] },
    name: { lineHeight: 16, transform: [{ translateY: 1.5 }] },
  },
});

/**
 * An @mention on a rounded chip, sitting in the line like a word: tapping
 * it opens the person's profile, not the message's thread, and holding it
 * still opens the menu. One that mentions you is tinted more strongly.
 * A view, not nested text, since only a view rounds its corners; so its
 * text sets its own size rather than inheriting the line's, and screen
 * readers reach it through the message's text (see `LinkedText`).
 */
function MentionChip({
  text,
  accountId,
  onAccent,
}: {
  text: string;
  accountId: string;
  onAccent: boolean;
}) {
  const { address } = useAccount();
  const openProfile = useOpenProfile();
  const press = useMenuPress();
  return (
    <Pressable
      delayLongPress={press?.delayLongPress}
      onPress={() => {
        linkTapped();
        openProfile(accountId);
      }}
      onLongPress={press?.onLongPress}
      onPressIn={press?.onPressIn}
      onPressOut={press?.onPressOut}
      className={cn(
        "justify-center rounded-md px-1 active:opacity-60",
        onAccent
          ? "bg-on-accent/25"
          : accountId === address
            ? "bg-accent/30"
            : "bg-accent/15",
      )}
      style={[{ borderCurve: "continuous" }, CHIP_FIT.chip]}
    >
      <Text
        style={CHIP_FIT.name}
        className={cn(
          "text-body font-semibold",
          onAccent ? "text-on-accent" : "text-accent",
        )}
      >
        {text}
      </Text>
    </Pressable>
  );
}

/** Text with its links, starting `offset` into the message (for keys). */
function withLinks(text: string, offset: number) {
  return textParts(text).map((part) =>
    part.url === undefined ? (
      part.text
    ) : (
      <Link key={offset + part.start} text={part.text} url={part.url} />
    ),
  );
}

/**
 * A message's text with its links underlined and tappable (a tap opens the
 * link, in its app if one is installed) and its @mentions on chips that
 * open the person's profile. Screen readers can't reach a view inside
 * text, so the text reads in full and each mention is an action.
 */
export function LinkedText({
  text,
  mentions,
  className,
  onAccent = false,
  edited = false,
}: {
  text: string;
  mentions?: readonly Mention[];
  className: string;
  /** On an accent-colored background (your own bubble). */
  onAccent?: boolean;
  /** Followed by " (edited)", in its own style. */
  edited?: boolean;
}) {
  const openProfile = useOpenProfile();
  const ranges = mentionRanges(text, mentions);
  const parts = new Array<ReactNode>();
  let at = 0;
  for (const range of ranges) {
    parts.push(...withLinks(text.slice(at, range.start), at));
    parts.push(
      <MentionChip
        key={`mention-${range.start}`}
        text={text.slice(range.start, range.end)}
        accountId={range.accountId}
        onAccent={onAccent}
      />,
    );
    at = range.end;
  }
  parts.push(...withLinks(text.slice(at), at));
  const mentioned = [
    ...new Map(
      ranges.map((range) => [
        range.accountId,
        text.slice(range.start + 1, range.end),
      ]),
    ),
  ];
  // After the parts, not among them: they're keyed, and it has none.
  return (
    <Text
      accessibilityLabel={
        ranges.length > 0 ? text + (edited ? EDITED : "") : undefined
      }
      accessibilityActions={
        mentioned.length > 0
          ? mentioned.map(([accountId, name]) => ({
              label: `Open ${name}'s profile`,
              name: accountId,
            }))
          : undefined
      }
      onAccessibilityAction={(event) => {
        const accountId = event.nativeEvent.actionName;
        if (mentioned.some(([mentionedId]) => mentionedId === accountId)) {
          openProfile(accountId);
        }
      }}
      className={className}
    >
      {parts}
      {edited && <EditedSuffix />}
    </Text>
  );
}
