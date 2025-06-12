import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { api } from "@/convex/_generated/api";
import { useMutation } from "convex/react";

export default function useComposer() {
  const [message, setMessage] = useState("");
  const createThread = useMutation(api.threads.requestThread);
  const newThreadMessage = useMutation(api.threads.newThreadMessage);
  const pathname = usePathname();

  const router = useRouter();

  const handleSendMessage = async () => {
    setMessage("");
    if (pathname === "/") {
      const threadId = await createThread({
        message: message,
      });
      router.push(`/chat/${threadId}`);
      return;
    } else {
      await newThreadMessage({
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
