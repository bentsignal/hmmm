import { Text } from "react-native";
import { textParts } from "@decentralized-convex/messages";

import { openLink } from "~/lib/open-link";
import { useMenuPress } from "./message-actions";

/** A link in the text: underlined, and holding it still opens the menu. */
function Link({ text, url }: { text: string; url: string }) {
  const press = useMenuPress();
  return (
    <Text
      accessibilityRole="link"
      onPress={() => openLink(url)}
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
      {textParts(text).map((part, index) =>
        part.url === undefined ? (
          part.text
        ) : (
          // A message's text never changes, so its parts never move.
          <Link key={index} text={part.text} url={part.url} />
        ),
      )}
    </Text>
  );
}
