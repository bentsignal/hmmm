import type { ReactNode } from "react";
import { Pressable, Text } from "react-native";
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
 * An @mention on a rounded chip, sitting in the line like a word: tapping
 * it opens the person's profile, not the message's thread, and holding it
 * still opens the menu. One that mentions you is tinted more strongly.
 * A view, not nested text, since only a view rounds its corners; so its
 * text sets its own size rather than inheriting the line's, and screen
 * readers reach it through the message's text (see `LinkedText`). It's
 * no taller than the line's ascent, so it doesn't open the line up, and
 * moved down to center on the text beside it.
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
        "translate-y-[2.5px] rounded-md px-1 active:opacity-60",
        onAccent
          ? "bg-on-accent/25"
          : accountId === address
            ? "bg-accent/30"
            : "bg-accent/15",
      )}
      style={{ borderCurve: "continuous" }}
    >
      <Text
        className={cn(
          "text-body translate-y-[1.5px] leading-4 font-semibold",
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
