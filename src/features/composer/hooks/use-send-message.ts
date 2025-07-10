import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ConvexError } from "convex/values";
import useComposerStore from "../store";
import { tryCatch } from "@/lib/utils";
import useUsage from "@/features/billing/hooks/use-usage";
import useThreadMutation from "@/features/thread/hooks/use-thread-mutation";
import useThreadStatus from "@/features/thread/hooks/use-thread-status";
import useThreadStore from "@/features/thread/store/thread-store";

export default function useSendMessage() {
  const router = useRouter();

  const promptEmpty = useComposerStore((state) => state.prompt.trim() === "");
  const setPrompt = useComposerStore((state) => state.setPrompt);
  const { createThread, newThreadMessage } = useThreadMutation();

  // state of current thread
  const activeThread = useThreadStore((state) => state.activeThread);
  const { isThreadIdle } = useThreadStatus({ threadId: activeThread ?? "" });

  const { usage } = useUsage();

  // state of speech
  const storeIsTranscribing = useComposerStore(
    (state) => state.storeIsTranscribing,
  );
  const listening = useComposerStore(
    (state) => state.storeIsListening || state.storeIsRecording,
  );

  // prevent user from sending messages
  const blockSend =
    !isThreadIdle || listening || promptEmpty || usage?.limitHit;

  // show loading spinner on send button
  const isLoading = !isThreadIdle || storeIsTranscribing;

  const sendMessage = async () => {
    if (blockSend) {
      return;
    }
    const prompt = useComposerStore.getState().prompt;
    const activeThread = useThreadStore.getState().activeThread;
    setPrompt("");
    if (activeThread === null) {
      const { data: threadId, error: threadCreationError } = await tryCatch(
        createThread({
          message: prompt,
        }),
      );
      if (threadCreationError) {
        if (threadCreationError instanceof ConvexError) {
          toast.error(threadCreationError.data as string);
          return;
        }
        toast.error("An internal error occurred. Please try again.");
        return;
      }
      router.push(`/chat/${threadId}`);
    } else {
      const { error: newThreadMessageError } = await tryCatch(
        newThreadMessage({
          threadId: activeThread,
          prompt: prompt,
        }),
      );
      if (newThreadMessageError) {
        if (newThreadMessageError instanceof ConvexError) {
          toast.error(newThreadMessageError.data as string);
          return;
        }
        toast.error("An internal error occurred. Please try again.");
        return;
      }
    }
  };

  return { blockSend, sendMessage, isLoading };
}
