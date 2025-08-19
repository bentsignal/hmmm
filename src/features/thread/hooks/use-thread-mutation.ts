import { optimisticallySendMessage } from "@convex-dev/agent/react";
import { useConvexMutation } from "@convex-dev/react-query";
import { useMutation as useTanstackMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";

export default function useThreadMutation() {
  const createThread = useMutation(api.ai.thread.create);
  const sendMessage = useMutation(
    api.ai.thread.sendMessage,
  ).withOptimisticUpdate(
    optimisticallySendMessage(api.ai.thread.getThreadMessages),
  );
  const { mutate: deleteThread } = useTanstackMutation({
    mutationFn: useConvexMutation(api.ai.thread.deleteThread),
    onError: (error) => {
      console.error(error);
      toast.error("Failed to delete thread");
    },
  });
  const { mutate: renameThread } = useTanstackMutation({
    mutationFn: useConvexMutation(api.ai.thread.rename),
    onError: (error) => {
      console.error(error);
      toast.error("Failed to rename thread");
    },
  });
  const { mutate: togglePinned } = useTanstackMutation({
    mutationFn: useConvexMutation(api.ai.thread.togglePinned),
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
