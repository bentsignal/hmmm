import { Loader2, Send } from "lucide-react";
import { useConvexAuth } from "convex/react";
import useSendMessage from "../hooks/use-send-message";
import { Button } from "@/components/ui/button";

export default function ComposerSend({
  showInstantLoad,
}: {
  showInstantLoad?: () => void;
}) {
  const { isAuthenticated } = useConvexAuth();
  const { sendMessage, blockSend, isLoading } = useSendMessage();
  return (
    <Button
      onClick={() => {
        sendMessage({ showInstantLoad });
      }}
      disabled={isAuthenticated && (blockSend || isLoading)}
      size="icon"
      className="shrink-0"
    >
      {isLoading && isAuthenticated ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Send className="h-4 w-4" />
      )}
    </Button>
  );
}
