import { Text } from "react-native";

import type { MemberNotice as Notice } from "./types";
import { cn } from "~/lib/cn";

/** Names longer than this are cut short, so a notice stays a line or two. */
const MAX_NAME_LENGTH = 40;

function shortened(name: string) {
  const characters = Array.from(name);
  if (characters.length <= MAX_NAME_LENGTH) return name;
  return `${characters
    .slice(0, MAX_NAME_LENGTH - 1)
    .join("")
    .trimEnd()}…`;
}

/** The space above a notice: like a sender's group, or close under another. */
function spaceAbove(stacked: boolean, followsNotice: boolean) {
  if (followsNotice) return "pt-1.5";
  return stacked ? "pt-5" : "pt-3";
}

/**
 * iMessage's "Maya left the conversation", centered between messages. A
 * long name wraps onto a second line, still centered. Stacked rows open
 * each sender's group with 20pt above it, so in that layout it takes 20pt
 * above too; notices in a row sit close together.
 */
export function MemberNotice({
  notice,
  stacked,
  followsNotice,
}: {
  notice: Notice;
  stacked: boolean;
  followsNotice: boolean;
}) {
  return (
    <Text
      className={cn(
        "text-caption text-muted px-12 text-center",
        spaceAbove(stacked, followsNotice),
      )}
    >
      <Text className="font-semibold">{shortened(notice.name)}</Text>
      {notice.kind === "joined"
        ? " joined the conversation"
        : " left the conversation"}
    </Text>
  );
}
