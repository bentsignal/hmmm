import { MemoizedResponse } from "./response-message";
import useStreamingMessage from "../hooks/use-streaming-message";
import useThreadStatus from "@/features/thread/hooks/use-thread-status";
import { Loader2 } from "lucide-react";
import UsageMessageListCallout from "@/features/billing/components/usage-message-list-callout";

interface StreamingMessageProps {
  threadId: string;
}

export default function StreamingMessage({ threadId }: StreamingMessageProps) {
  const { isThreadIdle } = useThreadStatus({ threadId });
  const { streamingMessage, messageLength } = useStreamingMessage({
    threadId,
  });

  if (streamingMessage) {
    return (
      <>
        <MemoizedResponse
          message={streamingMessage}
          streaming={!isThreadIdle}
        />
        <UsageMessageListCallout />
      </>
    );
  } else if (messageLength > 0 && !isThreadIdle) {
    return (
      <>
        <div className="flex items-center justify-start">
          <Loader2 className="h-4 w-4 animate-spin" />
        </div>
        <UsageMessageListCallout />
      </>
    );
  }
  return null;
}
