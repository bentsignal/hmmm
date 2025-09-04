import { useConvexAuth, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import useUsage from "@/features/billing/hooks/use-usage";
import useSendMessage from "@/features/composer/hooks/use-send-message";

export default function ThreadFollowUps({ threadId }: { threadId: string }) {
  const { isAuthenticated } = useConvexAuth();
  const args = isAuthenticated ? { threadId } : "skip";
  const followUpQuestions = useQuery(api.ai.thread.getFollowUpQuestions, args);
  const empty = !followUpQuestions || followUpQuestions.length === 0;

  const { sendMessage } = useSendMessage();
  const { usage } = useUsage();

  if (usage?.limitHit) {
    return null;
  }

  return (
    <div
      className="flex max-w-[500px] flex-col gap-3 transition-opacity duration-1000"
      style={{
        opacity: empty ? 0 : 1,
      }}
    >
      {followUpQuestions?.map((question) => (
        <div
          key={question}
          className="bg-card/50 hover:bg-card/70 rounded-xl p-4 text-sm shadow-md backdrop-blur-sm transition-all duration-300 select-none hover:cursor-pointer"
          onClick={() => {
            sendMessage({ customPrompt: question, navigateToNewThread: false });
          }}
          role="button"
          aria-label={`Follow up question: ${question}`}
        >
          {question}
        </div>
      ))}
    </div>
  );
}
