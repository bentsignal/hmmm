import { UIMessage } from "@convex-dev/agent/react";
import useMostRecentMessage from "../../messages/hooks/use-most-recent-message";
import { Loader } from "@/components/ui/loader";
import { cn } from "@/lib/utils";
import PromptMessage from "@/features/messages/components/prompt-message";
import ThreadFollowUps from "@/features/thread/components/thread-follow-ups";

export default function ThreadFooter({
  threadId,
  messages,
}: {
  threadId: string;
  messages: UIMessage[];
}) {
  // used to get prompt message from optimistic update. for some reason, the main
  // messasge stream doesn't show the optimistic update. but since this query only
  // gets the most recent message, it will show the optimistic update.
  const { optimisticPromptMessage, waiting, hasNewMessages } =
    useMostRecentMessage({
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
      {optimisticPromptMessage && (
        <div className="w-full max-w-full">
          <PromptMessage message={optimisticPromptMessage} />
        </div>
      )}
      {waiting && (
        <div className="flex justify-start items-start min-h-[30vh]">
          <Loader variant="typing" size="md" />
        </div>
      )}
      {!waiting && !optimisticPromptMessage && (
        <ThreadFollowUps threadId={threadId} />
      )}
    </div>
  );
}
