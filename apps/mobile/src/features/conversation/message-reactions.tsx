import type { ReactNode } from "react";
import type { View as NativeView } from "react-native";
import { useRef, useState } from "react";
import { View } from "react-native";
import { LayoutAnimationConfig } from "react-native-reanimated";

import type { PreviewShape } from "./glass-message-menu";
import type { Message } from "./types";
import { selectionTick } from "~/lib/native-extras";
import {
  MessageTargetProvider,
  useMessageActions,
  useOpenReactions,
} from "./message-actions";
import { ChipRow } from "./reaction-chips";
import { Tapbacks } from "./tapbacks";

/**
 * The message's reactions, keeping the last loaded ones on screen while
 * they reload (new messages change which reactions a page asks for).
 */
function useShownReactions(message: Message) {
  const [lastLoaded, setLastLoaded] = useState(message.reactions);
  if (message.reactions !== undefined && message.reactions !== lastLoaded) {
    setLastLoaded(message.reactions);
  }
  return message.reactions ?? lastLoaded ?? [];
}

/**
 * A message whose parts open the glass overlay on a long press, and its
 * reactions on a double tap (each wraps itself in `MenuTargetView` or uses
 * `useMenuTarget`). Its reactions show as iMessage tapbacks over the top
 * corner (`tapbacks`, for bubbles), which show who reacted when tapped, or
 * as Slack's chips underneath (`chips`, for stacked rows), which add or
 * take back that reaction.
 */
export function InteractiveMessage({
  message,
  align,
  shape,
  reactionStyle,
  children,
}: {
  message: Message;
  /** Which side the message sits on. */
  align: "end" | "start";
  /** How its text lifts. */
  shape: PreviewShape;
  reactionStyle: "chips" | "tapbacks";
  children: ReactNode;
}) {
  const { toggleReaction } = useMessageActions();
  const reactions = useShownReactions(message);
  const body = useRef<NativeView>(null);
  const openReactions = useOpenReactions({
    align,
    measured: body,
    message,
    preview: children,
    shape,
  });
  return (
    // Reactions already there when the row mounts don't pop in on scroll;
    // only one added while the conversation is open does.
    <LayoutAnimationConfig skipEntering>
      <View className={align === "end" ? "self-end" : "self-start"}>
        {reactionStyle === "tapbacks" && reactions.length > 0 && (
          <Tapbacks
            reactions={reactions}
            align={align}
            onPress={openReactions}
          />
        )}
        <View ref={body}>
          <MessageTargetProvider message={message} align={align} shape={shape}>
            {children}
          </MessageTargetProvider>
        </View>
        {reactionStyle === "chips" && reactions.length > 0 && (
          <ChipRow
            reactions={reactions}
            align={align}
            onToggle={(emoji) => {
              selectionTick();
              toggleReaction(message.id, emoji);
            }}
          />
        )}
      </View>
    </LayoutAnimationConfig>
  );
}
