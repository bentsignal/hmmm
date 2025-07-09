import { Loader2 } from "lucide-react";
import useStreamingMessage from "../hooks/use-streaming-message";
import { MemoizedResponse } from "./response-message";
import useThreadStatus from "@/features/thread/hooks/use-thread-status";

interface StreamingMessageProps {
  threadId: string;
}

export default function StreamingMessage({ threadId }: StreamingMessageProps) {
  const { isThreadIdle } = useThreadStatus({ threadId });
  const { streamingMessage, waiting } = useStreamingMessage({
    threadId,
  });

  if (waiting) {
    return (
      <div className="flex items-center justify-start">
        <Loader2 className="h-4 w-4 animate-spin" />
      </div>
    );
  } else if (streamingMessage) {
    return (
      <MemoizedResponse message={streamingMessage} streaming={!isThreadIdle} />
    );
  }
  return null;
}
