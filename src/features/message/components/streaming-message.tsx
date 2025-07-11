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

  if (!waiting && !streamingMessage) {
    return null;
  }

  return (
    <div className="w-full flex justify-start items-start max-w-full min-h-[calc(100vh-30rem)]">
      {waiting ? (
        <div className="flex justify-start items-start min-h-[30vh]">
          <Loader2 className="h-4 w-4 animate-spin" />
        </div>
      ) : streamingMessage ? (
        <MemoizedResponse
          message={streamingMessage}
          streaming={!isThreadIdle}
        />
      ) : null}
    </div>
  );
}
