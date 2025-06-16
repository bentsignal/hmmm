import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import useModelStore from "@/features/models/store";
import useThreadMutation from "@/features/thread/hooks/use-thread-mutation";
import useThreadStatus from "@/features/thread/hooks/use-thread-status";
import { toast } from "sonner";

export default function useComposer() {
  const pathname = usePathname();
  const router = useRouter();
  const threadId = pathname.split("/").pop() ?? "";

  const [message, setMessage] = useState("");
  const { currentModel } = useModelStore();
  const { createThread, newThreadMessage } = useThreadMutation();
  const { isThreadStreaming } = useThreadStatus({ threadId });

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
    try {
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
    } catch (error) {
      console.error(error);
      if ((error as Error).message.includes("User is not subscribed")) {
        toast.error("Error: Access denied.");
      } else {
        toast.error("Error: Failed to generate response. Please try again.");
      }
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
