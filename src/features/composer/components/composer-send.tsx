import { Loader2, Send } from "lucide-react";
import useSendMessage from "../hooks/use-send-message";
import { Button } from "@/components/ui/button";

export default function ComposerSend({
  showInstantLoad,
}: {
  showInstantLoad?: () => void;
}) {
  const { sendMessage, blockSend, isLoading } = useSendMessage();
  return (
    <Button
      onClick={() => {
        showInstantLoad?.();
        sendMessage();
      }}
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
