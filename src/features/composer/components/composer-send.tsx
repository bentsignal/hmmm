import { Send } from "lucide-react";
import useSendMessage from "../hooks/use-send-message";
import { Button } from "@/components/ui/button";
import { Loader } from "@/components/ui/loader";

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
        <Loader variant="dots" size="sm" />
      ) : (
        <Send className="h-4 w-4" />
      )}
    </Button>
  );
}
