import { redirect, useRouter } from "next/navigation";
import { toast } from "sonner";
import { useConvexAuth } from "convex/react";
import { ConvexError } from "convex/values";
import useComposerStore from "../store";
import { tryCatch } from "@/lib/utils";
import useUsage from "@/features/billing/hooks/use-usage";
import useMessageStore from "@/features/messages/store";
import useThreadMutation from "@/features/thread/hooks/use-thread-mutation";
import useThreadStatus from "@/features/thread/hooks/use-thread-status";
import useThreadStore from "@/features/thread/store/thread-store";

export default function useSendMessage() {
  const { isAuthenticated } = useConvexAuth();
  const router = useRouter();

  const setPrompt = useComposerStore((state) => state.setPrompt);
  const { createThread, sendMessageInThread } = useThreadMutation();

  // state of current thread
  const activeThread = useThreadStore((state) => state.activeThread);
  const { isThreadIdle } = useThreadStatus({ threadId: activeThread ?? "" });

  // usage of user during their current billing period (period is dependent on sub tier)
  const { usage } = useUsage();

  // state of speech
  const storeIsTranscribing = useComposerStore(
    (state) => state.storeIsTranscribing,
  );
  const listening = useComposerStore(
    (state) => state.storeIsListening || state.storeIsRecording,
  );

  // prevent user from sending messages when in bad state
  const blockSend = !isThreadIdle || listening || usage?.limitHit;

  // show loading spinner on send button
  const isLoading = !isThreadIdle || storeIsTranscribing;

  // set total number of messages sent per session, used to trigger
  // auto scroll when new messages are sent
  const setNumMessagesSent = useMessageStore(
    (state) => state.setNumMessagesSent,
  );

  const sendMessage = async ({
    customPrompt,
    navigateToNewThread = true,
    showInstantLoad,
  }: {
    customPrompt?: string;
    navigateToNewThread?: boolean;
    showInstantLoad?: () => void;
  }) => {
    // if customPrompt is provided, use it, otherwise use the prompt from the store
    const prompt = customPrompt ?? useComposerStore.getState().prompt;

    // if user is not authenticated, redirect to sign-up page. create thread after
    // they have signed in
    if (!isAuthenticated) {
      const redirectParams = new URLSearchParams();
      redirectParams.set("q", prompt);
      const url = "/sign-up?redirect_url=/new?" + redirectParams.toString();
      redirect(url);
    }

    // prevent user from sending messages if they are in a bad state
    if (blockSend) {
      return;
    }

    // prompt can't be empty
    if (prompt.trim() === "") {
      return;
    }
    setPrompt("");
    showInstantLoad?.();

    const activeThread = useThreadStore.getState().activeThread;

    // increment number of messages sent per session, this is used to
    // manage auto scrolling when new messages are sent
    setNumMessagesSent(useMessageStore.getState().numMessagesSent + 1);
    const attachedFiles = useComposerStore.getState().attachedFiles;
    const clearAttachments = useComposerStore.getState().clearAttachments;

    // if activeThread is null, create a new thread with the new message. if
    // not, send the new message to the currrently active thread
    if (activeThread === null) {
      const { data: threadId, error: threadCreationError } = await tryCatch(
        createThread({
          prompt: prompt,
          attachments: attachedFiles.map((file) => file.fileName),
        }),
      );
      if (threadCreationError) {
        if (threadCreationError instanceof ConvexError) {
          toast.error(threadCreationError.data as string);
          return;
        }
        toast.error("An internal error occurred. Please try again.");
        if (navigateToNewThread) {
          router.refresh();
        }
        return;
      }
      clearAttachments();
      if (navigateToNewThread) {
        router.push(`/chat/${threadId}`);
      }
      return threadId;
    } else {
      const { error: newThreadMessageError } = await tryCatch(
        sendMessageInThread({
          threadId: activeThread,
          prompt: prompt,
          attachments: attachedFiles.map((file) => file.fileName),
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
      clearAttachments();
    }
  };

  return { blockSend, sendMessage, isLoading };
}
