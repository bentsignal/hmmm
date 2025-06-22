import { Button } from "@/components/ui/button";
import { Loader2, Send } from "lucide-react";
import useSendMessage from "../hooks/use-send-message";

export default function ComposerSend() {
  const { sendMessage, blockSend, isLoading } = useSendMessage();

  return (
    <Button
      onClick={sendMessage}
      disabled={blockSend || isLoading}
      size="icon"
      className="shrink-0"
    >
      {isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Send className="h-4 w-4" />
      )}
    </Button>
  );
}
