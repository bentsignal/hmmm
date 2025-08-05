import { useConvexAuth, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import useUsage from "@/features/billing/hooks/use-usage";
import useSendMessage from "@/features/composer/hooks/use-send-message";

export default function ThreadFollowUps({ threadId }: { threadId: string }) {
  const { isAuthenticated } = useConvexAuth();
  const args = isAuthenticated ? { threadId } : "skip";
  const followUpQuestions = useQuery(
    api.thread.thread_queries.getThreadFollowUpQuestions,
    args,
  );
  const empty = !followUpQuestions || followUpQuestions.length === 0;

  const { sendMessage } = useSendMessage();
  const { usage } = useUsage();

  if (usage?.limitHit) {
    return null;
  }

  return (
    <div
      className="mt-4 flex max-w-[500px] flex-col gap-4 transition-opacity duration-1000"
      style={{
        opacity: empty ? 0 : 1,
      }}
    >
      {followUpQuestions?.map((question) => (
        <div
          key={question}
          className="text-secondary-foreground bg-secondary hover:bg-accent  
          rounded-md p-4 text-sm shadow-md
          transition-all duration-300 hover:cursor-pointer"
          onClick={() => {
            sendMessage({ prompt: question, redirect: false });
          }}
        >
          {question}
        </div>
      ))}
    </div>
  );
}
