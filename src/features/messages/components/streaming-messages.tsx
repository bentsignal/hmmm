import { UIMessage } from "@convex-dev/agent/react";
import useStreamingMessages from "../hooks/use-streaming-messages";
import Message from "./message";
import { Loader } from "@/components/ui/loader";
import { cn } from "@/lib/utils";
import ThreadFollowUps from "@/features/thread/components/thread-follow-ups";

interface StreamingMessagesProps {
  threadId: string;
  messages: UIMessage[];
}

export default function StreamingMessages({
  threadId,
  messages,
}: StreamingMessagesProps) {
  const { streamingMessages, waiting, hasNewMessages } = useStreamingMessages({
    threadId,
    messages,
  });

  return (
    <div
      className={cn(
        "w-full flex flex-col justify-start items-start max-w-full gap-16",
        hasNewMessages && "min-h-[calc(100vh-30rem)]",
      )}
    >
      {streamingMessages.map((message) => (
        <Message key={message.id} message={message} streaming={true} />
      ))}
      {waiting && (
        <div className="flex justify-start items-start min-h-[30vh]">
          <Loader variant="typing" size="md" />
        </div>
      )}
      {!waiting && streamingMessages.length === 0 && (
        <ThreadFollowUps threadId={threadId} />
      )}
    </div>
  );
}
