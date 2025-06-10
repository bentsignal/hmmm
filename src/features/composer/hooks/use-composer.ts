import { useState } from "react";
import { useRouter } from "next/navigation";

export default function useComposer() {
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [disabled, setDisabled] = useState(false);

  const router = useRouter();

  const handleSendMessage = async () => {
    router.push(`/chat/${crypto.randomUUID()}`);
    setIsLoading(true);
    setDisabled(true);
    setMessage("");
    console.log(message);
    await new Promise((resolve) => setTimeout(resolve, 1000));
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
