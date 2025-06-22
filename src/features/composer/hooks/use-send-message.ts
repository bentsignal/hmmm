import { toast } from "sonner";
import useComposerStore from "../store";
import useThreadStore from "@/features/thread/store/thread-store";
import useThreadMutation from "@/features/thread/hooks/use-thread-mutation";
import { useRouter } from "next/navigation";
import useThreadStatus from "@/features/thread/hooks/use-thread-status";

export default function useSendMessage() {
  const router = useRouter();

  const promptEmpty = useComposerStore((state) => state.prompt.trim() === "");
  const setPrompt = useComposerStore((state) => state.setPrompt);
  const { createThread, newThreadMessage } = useThreadMutation();

  // state of current thread
  const activeThread = useThreadStore((state) => state.activeThread);
  const { isThreadIdle } = useThreadStatus({ threadId: activeThread ?? "" });

  // state of speech
  const storeIsTranscribing = useComposerStore(
    (state) => state.storeIsTranscribing,
  );
  const listening = useComposerStore(
    (state) => state.storeIsListening || state.storeIsRecording,
  );

  // prevent user from sending messages
  const blockSend = !isThreadIdle || listening || promptEmpty;

  // show loading spinner on send button
  const isLoading = !isThreadIdle || storeIsTranscribing;

  const sendMessage = async () => {
    if (blockSend) {
      return;
    }
    try {
      const currentModel = useComposerStore.getState().currentModel;
      const prompt = useComposerStore.getState().prompt;
      setPrompt("");
      const activeThread = useThreadStore.getState().activeThread;
      const useSearch = useComposerStore.getState().useSearch;
      if (activeThread === null) {
        const threadId = await createThread({
          message: prompt,
          modelId: currentModel.id,
          useSearch: useSearch,
        });
        router.push(`/chat/${threadId}`);
      } else {
        await newThreadMessage({
          threadId: activeThread,
          prompt: prompt,
          modelId: currentModel.id,
          useSearch: useSearch,
        });
      }
    } catch (error) {
      console.error(error);
      if ((error as Error).message.includes("User is not subscribed")) {
        toast.error("Error: Access denied.");
      } else {
        toast.error("Error: Failed to generate response. Please try again.");
      }
    }
  };

  return { blockSend, sendMessage, isLoading };
}
