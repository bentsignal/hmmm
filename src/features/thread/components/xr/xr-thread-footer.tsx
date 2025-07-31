import { UIMessage } from "@convex-dev/agent/react";
import { Container } from "@react-three/uikit";
import { PromptMessage } from "../../../messages/components/xr";
import useMostRecentMessage from "../../../messages/hooks/use-most-recent-message";
import { TextElement } from "@/components/xr";

export default function XRThreadFooter({
  threadId,
  messages,
}: {
  threadId: string;
  messages: UIMessage[];
}) {
  const { optimisticPromptMessage, waiting } = useMostRecentMessage({
    threadId,
    messages,
  });

  return (
    <Container>
      {optimisticPromptMessage && (
        <PromptMessage message={optimisticPromptMessage} />
      )}
      {waiting && <TextElement>Waiting for response...</TextElement>}
    </Container>
  );
}
