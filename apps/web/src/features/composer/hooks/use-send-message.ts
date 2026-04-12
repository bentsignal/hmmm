import { useNavigate } from "@tanstack/react-router";
import { useConvexAuth } from "convex/react";
import { ConvexError } from "convex/values";
import { toast } from "sonner";

import type { LibraryFile } from "~/features/library/types/library-types";
import useUsage from "~/features/billing/hooks/use-usage";
import useMessageStore from "~/features/messages/store";
import useThreadMutation from "~/features/thread/hooks/use-thread-mutation";
import useThreadStatus from "~/features/thread/hooks/use-thread-status";
import useThreadStore from "~/features/thread/store/thread-store";
import { validatePrompt } from "~/lib/prompt";
import { tryCatch } from "~/lib/utils";
import useComposerStore from "../store";

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
  navigate: ReturnType<typeof useNavigate>;
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
  if (navigateToNewThread) {
    void deps.navigate({ to: `/chat/${threadId}` });
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

export default function useSendMessage() {
  const { isAuthenticated } = useConvexAuth();
  const navigate = useNavigate();

  const setPrompt = useComposerStore((state) => state.setPrompt);
  const { createThread, sendMessageInThread } = useThreadMutation();
  const deps = { createThread, sendMessageInThread, navigate };

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
      const redirectParams = new URLSearchParams();
      redirectParams.set("q", rawPrompt);
      void navigate({
        to: "/sign-up?redirect_url=/new?" + redirectParams.toString(),
      });
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
