import { useMutation as useTanstackMutation } from "@tanstack/react-query";
import { useConvexMutation } from "@convex-dev/react-query";
import { useMutation } from "convex/react";
import { toast } from "sonner";

import { api } from "@acme/db/api";

import { optimisticallySendMessage } from "../../messages/agent";

export function useThreadMutation() {
  const createThread = useMutation(api.ai.thread.mutations.create);
  const sendMessage = useMutation(
    api.ai.thread.mutations.sendMessage,
  ).withOptimisticUpdate(
    optimisticallySendMessage(api.ai.thread.queries.getThreadMessages),
  );
  const { mutate: deleteThread } = useTanstackMutation({
    mutationFn: useConvexMutation(api.ai.thread.mutations.deleteThread),
    onError: (error) => {
      console.error(error);
      toast.error("Failed to delete thread");
    },
  });
  const { mutate: renameThread } = useTanstackMutation({
    mutationFn: useConvexMutation(api.ai.thread.mutations.rename),
    onError: (error) => {
      console.error(error);
      toast.error("Failed to rename thread");
    },
  });
  const { mutate: togglePinned } = useTanstackMutation({
    mutationFn: useConvexMutation(api.ai.thread.mutations.togglePinned),
    onError: (error) => {
      console.error(error);
      toast.error("Failed to toggle thread pin");
    },
  });
  return {
    createThread,
    sendMessageInThread: sendMessage,
    deleteThread,
    renameThread,
    togglePinned,
  };
}
