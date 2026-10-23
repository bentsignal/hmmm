import type { MessageListProps } from "~/features/conversation/message-list";
import { MessageList } from "~/features/conversation/message-list";
import { NativeMessageList } from "./native-message-list";
import { useNativeList } from "./switch";

/**
 * A conversation's or thread's messages: in the native list when it's on
 * and this binary has it (`useNativeList`), and otherwise in the React
 * Native list, unchanged.
 */
export function ConversationList(props: MessageListProps) {
  return useNativeList() ? (
    <NativeMessageList {...props} />
  ) : (
    <MessageList {...props} />
  );
}
