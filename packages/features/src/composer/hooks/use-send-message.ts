import { useConvexAuth } from "convex/react";
import { ConvexError } from "convex/values";
import { toast } from "sonner";

import type { LibraryFile } from "../../library/types/library-types";
import { useUsage } from "../../billing/hooks/use-usage";
import { validatePrompt } from "../../lib/prompt";
import { tryCatch } from "../../lib/result";
import { useMessageStore } from "../../messages/store/message-store";
import { useThreadMutation } from "../../thread/hooks/use-thread-mutation";
import { useThreadStatus } from "../../thread/hooks/use-thread-status";
import { useThreadStore } from "../../thread/store/thread-store";
import { useComposerStore } from "../store/composer-store";

function mapAttachments(files: LibraryFile[]) {
  return files.map((file) => ({
    key: file.key,
    name: file.fileName,
    mimeType: file.mimeType,
  }));
}

function handleConvexError(error: unknown, handleError?: () => void) {
  handleError?.();
  if (error instanceof ConvexError) {
    toast.error(String(error.data));
    return;
  }
  toast.error("An internal error occurred. Please try again.");
}

interface ThreadActionDeps {
  createThread: ReturnType<typeof useThreadMutation>["createThread"];
  sendMessageInThread: ReturnType<
    typeof useThreadMutation
  >["sendMessageInThread"];
  navigateToThread: (threadId: string) => void;
}

async function handleCreateThread(
  deps: ThreadActionDeps,
  {
    prompt,
    attachedFiles,
    clearAttachments,
    navigateToNewThread,
    handleError,
  }: {
    prompt: string;
    attachedFiles: LibraryFile[];
    clearAttachments: () => void;
    navigateToNewThread: boolean;
    handleError?: () => void;
  },
) {
  const { data: threadId, error: threadCreationError } = await tryCatch(
    deps.createThread({
      prompt,
      attachments: mapAttachments(attachedFiles),
    }),
  );
  if (threadCreationError) {
    handleConvexError(threadCreationError, handleError);
    return;
  }
  clearAttachments();
  if (navigateToNewThread && threadId) {
    deps.navigateToThread(threadId);
  }
  return threadId;
}

async function handleSendToThread(
  deps: ThreadActionDeps,
  {
    threadId,
    prompt,
    attachedFiles,
    clearAttachments,
    handleError,
  }: {
    threadId: string;
    prompt: string;
    attachedFiles: LibraryFile[];
    clearAttachments: () => void;
    handleError?: () => void;
  },
) {
  const { error: newThreadMessageError } = await tryCatch(
    deps.sendMessageInThread({
      threadId,
      prompt,
      attachments: mapAttachments(attachedFiles),
    }),
  );
  if (newThreadMessageError) {
    handleConvexError(newThreadMessageError, handleError);
    return;
  }
  clearAttachments();
}

interface UseSendMessageOptions {
  navigateToThread: (threadId: string) => void;
  navigateToSignUp: (rawPrompt: string) => void;
}

export function useSendMessage({
  navigateToThread,
  navigateToSignUp,
}: UseSendMessageOptions) {
  const { isAuthenticated } = useConvexAuth();

  const setPrompt = useComposerStore((state) => state.setPrompt);
  const { createThread, sendMessageInThread } = useThreadMutation();
  const deps = { createThread, sendMessageInThread, navigateToThread };

  const activeThread = useThreadStore((state) => state.activeThread);
  const { isThreadIdle } = useThreadStatus({ threadId: activeThread ?? "" });
  const { usage } = useUsage();

  const storeIsTranscribing = useComposerStore(
    (state) => state.storeIsTranscribing,
  );
  const listening = useComposerStore(
    (state) => state.storeIsListening || state.storeIsRecording,
  );

  const blockSend = !isThreadIdle || listening || usage?.limitHit;
  const isLoading = !isThreadIdle || storeIsTranscribing;

  const setNumMessagesSent = useMessageStore(
    (state) => state.setNumMessagesSent,
  );

  const sendMessage = async ({
    customPrompt,
    navigateToNewThread = true,
    showInstantLoad,
    handleError,
  }: {
    customPrompt?: string;
    navigateToNewThread?: boolean;
    showInstantLoad?: () => void;
    handleError?: () => void;
  }) => {
    const rawPrompt = customPrompt ?? useComposerStore.getState().prompt;

    if (!isAuthenticated) {
      navigateToSignUp(rawPrompt);
      return;
    }

    if (blockSend) return;

    const prompt = validatePrompt(rawPrompt);
    if (!prompt) return;

    setPrompt("");
    showInstantLoad?.();

    const currentThread = useThreadStore.getState().activeThread;
    setNumMessagesSent(useMessageStore.getState().numMessagesSent + 1);
    const attachedFiles = useComposerStore.getState().attachedFiles;
    const clearAttachments = useComposerStore.getState().clearAttachments;

    if (currentThread === null) {
      return await handleCreateThread(deps, {
        prompt,
        attachedFiles,
        clearAttachments,
        navigateToNewThread,
        handleError,
      });
    }

    await handleSendToThread(deps, {
      threadId: currentThread,
      prompt,
      attachedFiles,
      clearAttachments,
      handleError,
    });
  };

  return { blockSend, sendMessage, isLoading };
}
