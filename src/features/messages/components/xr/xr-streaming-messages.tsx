import { UIMessage } from "@convex-dev/agent/react";
import { Container } from "@react-three/uikit";
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
  const { streamingMessages, waiting } = useStreamingMessages({
    threadId,
    messages,
  });

  return (
    <Container>
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
