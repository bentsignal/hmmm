import { Info } from "lucide-react";
import type { SystemErrorCode } from "../types/message-types";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export default function ErrorMessage({
  code,
  dateTime,
}: {
  code: SystemErrorCode;
  dateTime: string;
}) {
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
        <span className="font-bold text-destructive">System Error:</span> Ran
        into an issue while generating your response.
      </span>
    </div>
  );
}
