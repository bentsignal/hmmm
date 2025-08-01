import { Mic } from "lucide-react";
import { useConvexAuth } from "convex/react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import useSpeech from "@/features/speech/hooks/use-speech";

export default function ComposerSpeech() {
  const { isAuthenticated } = useConvexAuth();

  const { startSpeech, stopSpeech, inProgress, processing, disabled } =
    useSpeech();

  if (!isAuthenticated) {
    return null;
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div>
          <Button
            variant="outline"
            size="icon"
            onClick={inProgress ? stopSpeech : startSpeech}
            disabled={disabled}
          >
            <Mic
              width={24}
              height={24}
              className={cn(inProgress ? "animate-pulse text-red-400" : "")}
            />
          </Button>
        </div>
      </TooltipTrigger>
      {!disabled && (
        <TooltipContent>
          <p>
            {inProgress
              ? "Listening..."
              : processing
                ? "Processing..."
                : "Record your voice"}
          </p>
        </TooltipContent>
      )}
    </Tooltip>
  );
}
