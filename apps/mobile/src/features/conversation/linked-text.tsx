import { Text } from "react-native";
import { textParts } from "@decentralized-convex/messages";

import { openLink } from "~/lib/open-link";
import { useLinkTap, useMenuPress } from "./message-actions";

/**
 * A link in the text: underlined, and holding it still opens the menu.
 * Tapping it opens the link, not the message's thread.
 */
function Link({ text, url }: { text: string; url: string }) {
  const press = useMenuPress();
  const tapped = useLinkTap();
  return (
    <Text
      accessibilityRole="link"
      onPress={() => {
        tapped?.();
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
 * A message's text with its links underlined and tappable; a tap opens the
 * link (in its app, if one is installed).
 */
export function LinkedText({
  text,
  className,
}: {
  text: string;
  className: string;
}) {
  return (
    <Text className={className}>
      {textParts(text).map((part) =>
        part.url === undefined ? (
          part.text
        ) : (
          <Link key={part.start} text={part.text} url={part.url} />
        ),
      )}
    </Text>
  );
}
