import { useEffect, useState } from "react";
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

  // prevent loading state from showing up immediately on page load
  const [optimisticEnable, setOptimisticEnable] = useState(true);
  useEffect(() => {
    setTimeout(() => {
      setOptimisticEnable(false);
    }, 3000);
  }, []);

  return (
    <Button
      onClick={() => {
        sendMessage({ showInstantLoad });
      }}
      disabled={
        isAuthenticated && (blockSend || isLoading) && !optimisticEnable
      }
      size="icon"
      className="shrink-0"
    >
      {isLoading && isAuthenticated && !optimisticEnable ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Send className="h-4 w-4" />
      )}
    </Button>
  );
}
