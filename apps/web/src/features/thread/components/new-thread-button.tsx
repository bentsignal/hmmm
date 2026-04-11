import { useNavigate } from "@tanstack/react-router";
import { SquarePen } from "lucide-react";

import { Button } from "@acme/ui/button";
import { useIsMobile } from "@acme/ui/hooks/use-mobile";
import { useSidebar } from "@acme/ui/sidebar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@acme/ui/tooltip";

import { shortcuts } from "~/features/shortcuts";
import useShortcut from "~/features/shortcuts/hooks/use-shortcut";

export default function NewThreadButton() {
  const { toggleSidebar } = useSidebar();
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  // start new thread on "ctrl/cmd + /"
  useShortcut({
    hotkey: shortcuts["new-chat"].hotkey,
    callback: () => {
      navigate({ to: "/" });
    },
  });

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          size="icon"
          onClick={() => {
            if (isMobile) {
              toggleSidebar();
            }
            navigate({ to: "/" });
          }}
        >
          <SquarePen className="h-4 w-4" />
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        <p>New chat</p>
      </TooltipContent>
    </Tooltip>
  );
}
