import { Mic } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface SpeechRecordingProps {
  startRecording: () => void;
  stopRecording: () => void;
  isRecording: boolean;
}

export default function SpeechRecording({
  startRecording,
  stopRecording,
  isRecording,
}: SpeechRecordingProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div>
          <Button
            variant="outline"
            size="icon"
            onClick={isRecording ? stopRecording : startRecording}
          >
            <Mic
              width={24}
              height={24}
              color={isRecording ? "lightcoral" : "whitesmoke"}
            />
          </Button>
        </div>
      </TooltipTrigger>
      <TooltipContent>
        <p>{isRecording ? "Stop recording" : "Start recording"}</p>
      </TooltipContent>
    </Tooltip>
  );
}
