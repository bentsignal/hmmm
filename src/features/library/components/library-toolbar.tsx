import {
  LayoutGrid as GridIcon,
  List as ListIcon,
  ArrowDownWideNarrow as SortIcon,
} from "lucide-react";
import { LibrarySort, LibrarySortDirection, LibraryView } from "../types";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export const LibraryToolbar = ({
  view,
  setView,
  setSort,
  setSortDirection,
  setSearchTerm,
}: {
  view: LibraryView;
  setView: (value: LibraryView) => void;
  setSort: (value: LibrarySort) => void;
  setSortDirection: (value: LibrarySortDirection) => void;
  setSearchTerm: (value: string) => void;
}) => {
  return (
    <div className="flex w-full justify-between gap-2">
      <Input
        placeholder="Search"
        onChange={(e) => setSearchTerm(e.target.value)}
      />
      <div className="flex items-center gap-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setView(view === "grid" ? "list" : "grid")}
            >
              {view === "grid" ? (
                <GridIcon className="h-4 w-4" />
              ) : (
                <ListIcon className="h-4 w-4" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>View</TooltipContent>
        </Tooltip>
        <DropdownMenu>
          <Tooltip>
            <TooltipTrigger asChild>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon">
                  <SortIcon className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
            </TooltipTrigger>
            <TooltipContent>Sort</TooltipContent>
          </Tooltip>
          <DropdownMenuContent>
            <DropdownMenuLabel>Sort by</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>Date</DropdownMenuSubTrigger>
              <DropdownMenuPortal>
                <DropdownMenuSubContent>
                  <DropdownMenuItem
                    onClick={() => {
                      setSort("date");
                      setSortDirection("desc");
                    }}
                  >
                    Newest
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => {
                      setSort("date");
                      setSortDirection("asc");
                    }}
                  >
                    Oldest
                  </DropdownMenuItem>
                </DropdownMenuSubContent>
              </DropdownMenuPortal>
            </DropdownMenuSub>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>Name</DropdownMenuSubTrigger>
              <DropdownMenuPortal>
                <DropdownMenuSubContent>
                  <DropdownMenuItem
                    onClick={() => {
                      setSort("name");
                      setSortDirection("asc");
                    }}
                  >
                    A - Z
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => {
                      setSort("name");
                      setSortDirection("desc");
                    }}
                  >
                    Z - A
                  </DropdownMenuItem>
                </DropdownMenuSubContent>
              </DropdownMenuPortal>
            </DropdownMenuSub>
            <DropdownMenuItem
              onClick={() => {
                setSort("type");
                setSortDirection("desc");
              }}
            >
              Type
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
};
