import { SquarePen } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useSidebar } from "@/components/ui/sidebar";
import { useIsMobile } from "@/hooks/use-mobile";

export default function NewThreadButton() {
  const { toggleSidebar } = useSidebar();
  const router = useRouter();
  const isMobile = useIsMobile();
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
