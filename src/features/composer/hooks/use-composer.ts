import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/convex/_generated/api";
import { useMutation } from "convex/react";

export default function useComposer() {
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [disabled, setDisabled] = useState(false);
  const createThread = useMutation(api.threads.create);

  const router = useRouter();

  const handleSendMessage = async () => {
    router.push(`/chat/${crypto.randomUUID()}`);
    setIsLoading(true);
    setDisabled(true);
    setMessage("");
    await createThread({
      id: crypto.randomUUID(),
      title: message,
    });
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
