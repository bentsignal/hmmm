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
              <Info className="text-destructive h-4 w-4" />
            </TooltipTrigger>
            <TooltipContent>
              <p>{dateTime}</p>
              <p className="text-xs text-red-500">Error Code: {code}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      <span className="text-muted-foreground text-sm">
        <span className="text-destructive font-bold">System Error:</span> Ran
        into an issue while generating your response.
      </span>
    </div>
  );
}
