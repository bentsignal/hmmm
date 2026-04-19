// eslint-disable-next-line no-restricted-imports -- non-suspending useQuery is intentional so this hook reacts to activeThread changes without triggering a suspense boundary on every thread switch
import { useQuery } from "@tanstack/react-query";
import { ConvexError } from "convex/values";
import { toast } from "sonner";

import type { LibraryFile } from "../../library/types/library-types";
import { useUsage } from "../../billing/hooks/use-usage";
import { validatePrompt } from "../../lib/prompt";
import { tryCatch } from "../../lib/result";
import { useMessageStore } from "../../messages/store/message-store";
import { useThreadMutation } from "../../thread/hooks/use-thread-mutation";
import { threadQueries } from "../../thread/lib/queries";
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
}

export function useSendMessage({ navigateToThread }: UseSendMessageOptions) {
  const setPrompt = useComposerStore((state) => state.setPrompt);
  const { createThread, sendMessageInThread } = useThreadMutation();
  const deps = { createThread, sendMessageInThread, navigateToThread };

  const activeThread = useThreadStore((state) => state.activeThread);
  const { data: threadState } = useQuery({
    ...threadQueries.state(activeThread ?? ""),
    select: (state) => state,
  });
  const { usage } = useUsage();

  const storeIsTranscribing = useComposerStore(
    (state) => state.storeIsTranscribing,
  );
  const isRecording = useComposerStore((state) => state.storeIsRecording);

  // Treat pending (undefined) as idle so the composer doesn't spuriously
  // flag "generating" while the query is still loading on first mount.
  const isGenerating = threadState != null;
  const blockSend = isGenerating || isRecording || usage?.limitHit;
  const isLoading = isGenerating || storeIsTranscribing;

  const setNumMessagesSent = useMessageStore(
    (state) => state.setNumMessagesSent,
  );

  async function sendMessage({
    customPrompt,
    navigateToNewThread = true,
    showInstantLoad,
    handleError,
  }: {
    customPrompt?: string;
    navigateToNewThread?: boolean;
    showInstantLoad?: () => void;
    handleError?: () => void;
  }) {
    const rawPrompt = customPrompt ?? useComposerStore.getState().prompt;

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
  }

  return { blockSend, sendMessage, isLoading, isGenerating };
}
