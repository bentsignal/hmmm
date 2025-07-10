import { UIMessage } from "ai";
import { Info } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export default function ErrorMessage({
  message,
  dateTime,
}: {
  message: UIMessage;
  dateTime: string;
}) {
  const noLabel = message.content.replace("--SYSTEM_ERROR--", "");
  const code = noLabel.slice(0, noLabel.indexOf("-"));
  const messageText = noLabel.slice(noLabel.indexOf("-") + 1);
  return (
    <div className="flex w-full items-center gap-1">
      <div className="flex justify-start gap-2">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger>
              <Info className="h-4 w-4 text-destructive" />
            </TooltipTrigger>
            <TooltipContent>
              <p>{dateTime}</p>
              <p className="text-xs text-red-500">Error Code: {code}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      <span className="text-sm text-muted-foreground">
        <span className="font-bold text-destructive">System Error:</span>{" "}
        {messageText}
      </span>
    </div>
  );
}
