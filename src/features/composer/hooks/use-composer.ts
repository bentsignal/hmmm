import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { api } from "@/convex/_generated/api";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { optimisticallySendMessage } from "@convex-dev/agent/react";
import useModelStore from "@/features/models/store";

export default function useComposer() {
  const [message, setMessage] = useState("");
  const { currentModel } = useModelStore();

  // handle creation of new messages & threads
  const createThread = useMutation(api.threads.requestNewThreadCreation);
  const newThreadMessage = useMutation(
    api.threads.newThreadMessage,
  ).withOptimisticUpdate(
    optimisticallySendMessage(api.threads.getThreadMessages),
  );

  const pathname = usePathname();
  const router = useRouter();
  const threadId = pathname.split("/").pop() ?? "";

  // determine if messages are being streamed back
  const { isAuthenticated } = useConvexAuth();
  const args = isAuthenticated ? { threadId } : "skip";
  const isThreadStreaming = useQuery(api.threads.isThreadStreaming, args);
  const [optimisticallyBlockSend, setOptimisticallyBlockSend] = useState(false);
  const blockSend =
    isThreadStreaming || optimisticallyBlockSend || message.trim() === "";
  const isLoading = isThreadStreaming || optimisticallyBlockSend;

  const handleSendMessage = async () => {
    if (blockSend) {
      return;
    }
    setMessage("");
    setOptimisticallyBlockSend(true);
    setTimeout(() => {
      setOptimisticallyBlockSend(false);
    }, 2000);
    if (pathname === "/") {
      const threadId = await createThread({
        message: message,
        modelId: currentModel.id,
      });
      router.push(`/chat/${threadId}`);
      return;
    } else {
      await newThreadMessage({
        threadId: pathname.split("/")[2],
        prompt: message,
        modelId: currentModel.id,
      });
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return {
    message,
    setMessage,
    handleSendMessage,
    handleKeyPress,
    isLoading,
    blockSend,
  };
}
