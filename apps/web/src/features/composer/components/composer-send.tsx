import { useEffect, useState } from "react";
import { useConvexAuth } from "convex/react";
import { Loader2, Send } from "lucide-react";

import { Button } from "@acme/ui/button";

import useSendMessage from "../hooks/use-send-message";

export default function ComposerSend({
  showInstantLoad,
  handleError,
}: {
  showInstantLoad?: () => void;
  handleError?: () => void;
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
        sendMessage({ showInstantLoad, handleError });
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
