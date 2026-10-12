import { Text, View } from "react-native";
import Animated from "react-native-reanimated";

import type { Message } from "./types";
import { Avatar } from "~/components/avatar";
import { cn } from "~/lib/cn";
import { formatTime } from "~/lib/format";
import { attachmentKey } from "./attachment-key";
import { AttachmentView } from "./attachment-view";
import { LinkCards } from "./link-preview-card";
import { MenuTargetView } from "./message-actions";
import { InteractiveMessage } from "./message-reactions";
import { NotSent, SendingFade, SENT_FADE_MS } from "./message-status";
import { linkCardsOf, visibleBody } from "./message-text";

const AVATAR_COLUMN = 36;

/** Slack/Discord-style: everyone left-aligned with a photo and name. */
export function MessageStacked({
  message,
  author,
  startsGroup,
}: {
  message: Message;
  author: { avatarUrl: string | null; displayName: string };
  startsGroup: boolean;
}) {
  const body = visibleBody(message);
  const cards = linkCardsOf(message);
  return (
    <View className={cn("flex-row gap-3 px-4", startsGroup ? "pt-5" : "pt-1")}>
      <View style={{ width: AVATAR_COLUMN }}>
        {startsGroup && (
          <Avatar name={author.displayName} size="row" uri={author.avatarUrl} />
        )}
      </View>
      <View className="flex-1 gap-1">
        {startsGroup && (
          <View className="flex-row items-baseline gap-2">
            <Text className="text-subhead text-foreground font-semibold">
              {author.displayName}
            </Text>
            {/* Always laid out, so the name never shifts; it fades in once
                the message is sent. */}
            <Animated.Text
              className="text-caption text-muted"
              style={{
                opacity: message.status === undefined ? 1 : 0,
                transitionDuration: SENT_FADE_MS,
                transitionProperty: "opacity",
                transitionTimingFunction: "ease-out",
              }}
            >
              {formatTime(message.sentAt)}
            </Animated.Text>
          </View>
        )}
        <InteractiveMessage
          message={message}
          align="start"
          shape="card"
          reactionStyle="chips"
        >
          <SendingFade status={message.status}>
            <View className="items-start gap-1">
              {body !== undefined && (
                <MenuTargetView>
                  <Text className="text-body text-foreground">{body}</Text>
                </MenuTargetView>
              )}
              {message.attachments.map((attachment) => (
                <AttachmentView
                  key={attachmentKey(attachment)}
                  attachment={attachment}
                  sending={message.status === "sending"}
                />
              ))}
              {cards.length > 0 && <LinkCards cards={cards} />}
            </View>
          </SendingFade>
        </InteractiveMessage>
        <NotSent message={message} />
      </View>
    </View>
  );
}
