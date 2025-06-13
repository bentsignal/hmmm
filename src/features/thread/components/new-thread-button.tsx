"use client";

import { Button } from "@/components/ui/button";
import { useSidebar } from "@/components/ui/sidebar";
import { useIsMobile } from "@/hooks/use-mobile";
import { useRouter } from "next/navigation";

export default function NewThreadButton() {
  const router = useRouter();
  const { toggleSidebar } = useSidebar();
  const isMobile = useIsMobile();
  return (
    <Button
      className="w-full"
      size="lg"
      onClick={() => {
        if (isMobile) {
          toggleSidebar();
        }
        router.push("/");
      }}
    >
      <span className="font-bold">New Chat</span>
    </Button>
  );
}
