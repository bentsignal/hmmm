import { useMutation as useTanstackMutation } from "@tanstack/react-query";
import { useConvexMutation } from "@convex-dev/react-query";
import { useMutation } from "convex/react";
import { toast } from "sonner";

import { api } from "@acme/db/api";

import { optimisticallySendMessage } from "../../messages/agent";
import { optimisticallyCreateThread } from "../lib/mutations";

export function useThreadMutation() {
  const createThread = useMutation(
    api.ai.thread.lifecycle.create,
  ).withOptimisticUpdate(optimisticallyCreateThread);
  const sendMessage = useMutation(
    api.ai.thread.messages.send,
  ).withOptimisticUpdate((store, args) => {
    optimisticallySendMessage(api.ai.thread.messages.list)(store, args);
    store.setQuery(
      api.ai.thread.state.get,
      { threadId: args.threadId },
      "user_message_sent",
    );
  });
  const abortMutation = useMutation(
    api.ai.thread.generation.abort,
  ).withOptimisticUpdate((store, args) => {
    store.setQuery(api.ai.thread.state.get, { threadId: args.threadId }, null);
  });
  function abortGeneration(args: { threadId: string }) {
    abortMutation(args).catch((error) => {
      console.error(error);
      toast.error("Failed to stop generation");
    });
  }
  const { mutate: deleteThread } = useTanstackMutation({
    mutationFn: useConvexMutation(api.ai.thread.lifecycle.remove),
    onError: (error) => {
      console.error(error);
      toast.error("Failed to delete thread");
    },
  });
  const { mutate: togglePinned } = useTanstackMutation({
    mutationFn: useConvexMutation(api.ai.thread.pinned.toggle),
    onError: (error) => {
      console.error(error);
      toast.error("Failed to toggle thread pin");
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
