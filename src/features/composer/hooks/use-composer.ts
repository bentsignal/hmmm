import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { api } from "@/convex/_generated/api";
import { useMutation } from "convex/react";

export default function useComposer() {
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [disabled, setDisabled] = useState(false);
  const createThread = useMutation(api.threads.create);
  const createMessage = useMutation(api.messages.create);
  const pathname = usePathname();

  const router = useRouter();

  const handleSendMessage = async () => {
    setMessage("");
    setIsLoading(true);
    setDisabled(true);
    if (pathname === "/") {
      const threadId = crypto.randomUUID();
      router.push(`/chat/${threadId}`);
      await createThread({
        threadId: threadId,
        title: message,
        message: message,
      });
      return;
    } else {
      await createMessage({
        threadId: pathname.split("/")[2],
        message: message,
      });
    }
    setIsLoading(false);
    setDisabled(false);
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
    isLoading,
    disabled,
    handleSendMessage,
    handleKeyPress,
  };
}
