import { optimisticallySendMessage } from "@convex-dev/agent/react";
import { useConvexMutation } from "@convex-dev/react-query";
import { useMutation as useTanstackMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";

export default function useThreadMutation() {
  const createThread = useMutation(
    api.thread.thread_mutations.requestNewThread,
  );
  const newThreadMessage = useMutation(
    api.thread.thread_mutations.newThreadMessage,
  ).withOptimisticUpdate(
    optimisticallySendMessage(api.thread.thread_queries.getThreadMessages),
  );
  const { mutate: deleteThread } = useTanstackMutation({
    mutationFn: useConvexMutation(api.thread.thread_mutations.deleteThread),
    onError: (error) => {
      console.error(error);
      toast.error("Failed to delete thread");
    },
  });
  const { mutate: renameThread } = useTanstackMutation({
    mutationFn: useConvexMutation(api.thread.thread_mutations.renameThread),
    onError: (error) => {
      console.error(error);
      toast.error("Failed to rename thread");
    },
  });
  return {
    createThread,
    newThreadMessage,
    deleteThread,
    renameThread,
  };
}
