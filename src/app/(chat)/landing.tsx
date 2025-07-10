import { Info } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export default async function Landing() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-2 mx-4">
      <div className="flex items-center gap-2">
        <span className="text-2xl font-bold">QBE</span>
        <Tooltip>
          <TooltipTrigger>
            <Info className="h-5 w-5" />
          </TooltipTrigger>
          <TooltipContent>
            <span className="font-semibold">&quot;cube&quot;</span>
          </TooltipContent>
        </Tooltip>
      </div>
      <span className="text-muted-foreground text-lg font-semibold text-center">
        The first AI Chat app to embrace the z-axis.
      </span>
      <Button asChild className="mt-2">
        <Link href="/sign-up" className="text-lg font-semibold">
          Get Started
        </Link>
      </Button>
    </div>
  );
}
