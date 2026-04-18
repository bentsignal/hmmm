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
  const { mutate: togglePinned } = useTanstackMutation({
    mutationFn: useConvexMutation(api.ai.thread.mutations.togglePinned),
    onError: (error) => {
      console.error(error);
      toast.error("Failed to toggle thread pin");
    },
  });
  const { mutate: abortGeneration } = useTanstackMutation({
    mutationFn: useConvexMutation(api.ai.thread.mutations.abortGeneration),
    onError: (error) => {
      console.error(error);
      toast.error("Failed to stop generation");
    },
  });
  return {
    createThread,
    sendMessageInThread: sendMessage,
    deleteThread,
    togglePinned,
    abortGeneration,
  };
}
