import { optimisticallySendMessage } from "@convex-dev/agent/react";
import { useConvexMutation } from "@convex-dev/react-query";
import { useMutation as useTanstackMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";

export default function useThreadMutation() {
  const createThread = useMutation(api.threads.requestNewThreadCreation);
  const newThreadMessage = useMutation(
    api.threads.newThreadMessage,
  ).withOptimisticUpdate(
    optimisticallySendMessage(api.threads.getThreadMessages),
  );
  const { mutate: deleteThread } = useTanstackMutation({
    mutationFn: useConvexMutation(api.threads.deleteThread),
    onError: (error) => {
      console.error(error);
      toast.error("Failed to delete thread");
    },
  });
  return {
    createThread,
    newThreadMessage,
    deleteThread,
  };
}
