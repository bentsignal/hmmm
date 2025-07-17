import { XR_STYLES } from "@/styles/xr-styles";
import { Container } from "@react-three/uikit";
import { UIMessage } from "ai";
import { PromptMessage, ResponseMessage } from ".";
import useStreamingMessages from "../../hooks/use-streaming-messages";
import { TextElement } from "@/components/xr";

export default function XRStreamingMessages({
  threadId,
  messages,
}: {
  threadId: string;
  messages: UIMessage[];
}) {
  const { streamingMessages, waiting, hasNewMessages } = useStreamingMessages({
    threadId,
    messages,
  });

  return (
    <Container minHeight={hasNewMessages ? XR_STYLES.containerXs / 2 : 0}>
      {streamingMessages.map((message) =>
        message.role === "user" ? (
          <PromptMessage key={message.id} message={message} />
        ) : (
          <ResponseMessage
            key={message.id}
            message={message}
            streaming={true}
          />
        ),
      )}
      {waiting && <TextElement>Waiting for response...</TextElement>}
    </Container>
  );
}
