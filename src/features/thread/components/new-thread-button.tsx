import { SquarePen } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useSidebar } from "@/components/ui/sidebar";
import { useIsMobile } from "@/hooks/use-mobile";
import { shortcuts } from "@/features/shortcuts";
import useShortcut from "@/features/shortcuts/hooks/use-shortcut";

export default function NewThreadButton() {
  const { toggleSidebar } = useSidebar();
  const router = useRouter();
  const isMobile = useIsMobile();

  // start new thread on "ctrl/cmd + /"
  useShortcut({
    hotkey: shortcuts["new-chat"].hotkey,
    callback: () => {
      router.push("/");
    },
  });

  return (
    <Button
      className="w-full"
      onClick={() => {
        if (isMobile) {
          toggleSidebar();
        }
        router.push("/");
      }}
    >
      <SquarePen className="h-4 w-4" />
      <span className="text-sm font-semibold">New Chat</span>
    </Button>
  );
}
