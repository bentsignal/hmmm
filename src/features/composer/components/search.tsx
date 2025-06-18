import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Globe } from "lucide-react";

interface SearchProps {
  toggleSearch: () => void;
  useSearch: boolean;
}

export default function Search({ toggleSearch, useSearch }: SearchProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="outline" size="icon" onClick={toggleSearch}>
          <Globe className={cn("h-4 w-4", useSearch && "text-blue-300")} />
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        <p>Search the web</p>
      </TooltipContent>
    </Tooltip>
  );
}
