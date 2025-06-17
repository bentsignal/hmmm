import { Mic } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface SpeechTranscriptionProps {
  listening: boolean;
  handleStartListening: () => void;
  handleStopListening: () => void;
  supported: boolean;
}

export default function SpeechTranscription({
  listening,
  handleStartListening,
  handleStopListening,
  supported,
}: SpeechTranscriptionProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div>
          <Button
            variant="outline"
            size="icon"
            onClick={listening ? handleStopListening : handleStartListening}
            disabled={!supported}
          >
            <Mic
              width={24}
              height={24}
              color={listening ? "lightcoral" : "whitesmoke"}
            />
          </Button>
        </div>
      </TooltipTrigger>
      <TooltipContent>
        <p>
          {supported ? "Start listening" : "Not supported on this browser."}
        </p>
      </TooltipContent>
    </Tooltip>
  );
}
