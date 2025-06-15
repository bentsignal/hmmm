import { api } from "@/convex/_generated/api";
import { optimisticallySendMessage } from "@convex-dev/agent/react";
import { useMutation } from "convex/react";

export default function useThreadMutation() {
  const createThread = useMutation(api.threads.requestNewThreadCreation);
  const newThreadMessage = useMutation(
    api.threads.newThreadMessage,
  ).withOptimisticUpdate(
    optimisticallySendMessage(api.threads.getThreadMessages),
  );
  const deleteThread = useMutation(api.threads.deleteThread);
  return {
    createThread,
    newThreadMessage,
    deleteThread,
  };
}
