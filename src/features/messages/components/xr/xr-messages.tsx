import { memo, useEffect } from "react";
import { xrColors, xrStyles } from "@/styles/xr-styles";
import { UIMessage } from "@convex-dev/agent/react";
import { Button } from "@react-three/uikit-default";
import equal from "fast-deep-equal";
import { TextElement } from "@/components/xr";
import {
  PromptMessage,
  ResponseMessage,
} from "@/features/messages/components/xr";
import { PAGE_SIZE } from "@/features/messages/config";
import useMessages from "@/features/messages/hooks/use-messages";

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

  // when messages have loaded, tell parent component to scroll to the bottom of the page
  useEffect(() => {
    if (messages.length > 0) {
      triggerMessagesLoaded();
    }
  }, [messages.length, triggerMessagesLoaded]);

  // show a loading spinner when the user has sent a prompt and is waiting for a response
  const waiting =
    messages.length > 0 && messages[messages.length - 1].role === "user";

  return (
    <>
      {status !== "Exhausted" && status !== "LoadingFirstPage" && (
        <Button
          onClick={() => loadMore(PAGE_SIZE)}
          borderRadius={xrStyles.radiusLg}
        >
          <TextElement color={xrColors.card} textAlign="center">
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

const PureMessage = ({ message }: { message: UIMessage }) => {
  return message.role === "user" ? (
    <PromptMessage key={message.id} message={message} />
  ) : (
    <ResponseMessage key={message.id} message={message} />
  );
};

const Message = memo(PureMessage, (prev, next) => {
  return equal(prev.message, next.message);
});
