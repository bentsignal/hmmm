import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { api } from "@/convex/_generated/api";
import { useMutation } from "convex/react";

export default function useComposer() {
  const [message, setMessage] = useState("");
  const createThread = useMutation(api.threads.create);
  const createMessage = useMutation(api.messages.create);
  const pathname = usePathname();

  const router = useRouter();

  const handleSendMessage = async () => {
    setMessage("");
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
  };
}
