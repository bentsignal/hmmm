import { Loader2, Send } from "lucide-react";
import { redirect } from "next/navigation";
import { useConvexAuth } from "convex/react";
import useSendMessage from "../hooks/use-send-message";
import useComposerStore from "../store/composer-store";
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
        if (!isAuthenticated) {
          redirect("/sign-up");
        }
        const prompt = useComposerStore.getState().prompt;
        if (prompt.trim() !== "") {
          showInstantLoad?.();
        }
        sendMessage({ prompt });
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
