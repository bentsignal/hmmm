import { useEffect } from "react";
import { Button } from "@react-three/uikit-default";

import type { MyUIMessage } from "~/features/messages/types";
import { TextElement } from "~/components/xr";
import {
  PromptMessage,
  ResponseMessage,
} from "~/features/messages/components/xr";
import { PAGE_SIZE } from "~/features/messages/config";
import useMessages from "~/features/messages/hooks/use-messages";
import { hexColors, xrStyles } from "~/styles";
import { responseHasNoContent } from "../../util/message-util";

export default function XRMessages({
  threadId,
  triggerMessagesLoaded,
}: {
  threadId: string;
  triggerMessagesLoaded: () => void;
}) {
  const { messages, loadMore, status } = useMessages({
    threadId,
    streaming: true,
  });

  // eslint-disable-next-line no-restricted-syntax -- effect needed to notify parent to scroll after messages load (DOM sync)
  useEffect(() => {
    if (messages.length > 0) {
      triggerMessagesLoaded();
    }
  }, [messages.length, triggerMessagesLoaded]);

  // show a loading spinner when the user has sent a prompt and is waiting for a response
  const lastMessage = messages[messages.length - 1];
  const waiting =
    messages.length > 0 &&
    lastMessage !== undefined &&
    (lastMessage.role === "user" || responseHasNoContent(lastMessage));

  return (
    <>
      {status !== "Exhausted" && status !== "LoadingFirstPage" && (
        <Button
          onClick={() => loadMore(PAGE_SIZE)}
          borderRadius={xrStyles.radiusLg}
        >
          <TextElement color={hexColors.card} textAlign="center">
            Load More
          </TextElement>
        </Button>
      )}
      {messages.map((message) => (
        <Message key={message.id} message={message} />
      ))}
      {waiting && <TextElement>Waiting for response...</TextElement>}
    </>
  );
}

const PureMessage = ({ message }: { message: MyUIMessage }) => {
  if (message.role === "assistant" && responseHasNoContent(message)) {
    return null;
  }

  return message.role === "user" ? (
    <PromptMessage key={message.id} message={message} />
  ) : (
    <ResponseMessage key={message.id} message={message} />
  );
};

const Message = PureMessage;
