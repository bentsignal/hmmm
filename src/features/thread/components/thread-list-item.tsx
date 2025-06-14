"use client";

import { SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useSidebar } from "@/components/ui/sidebar";
import { useIsMobile } from "@/hooks/use-mobile";
import { Trash } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";

interface ThreadListItemProps {
  title: string;
  id: string;
  handleDelete: () => void;
}

export default function ThreadListItem({
  title,
  id,
  handleDelete,
}: ThreadListItemProps) {
  const pathname = usePathname();
  const { toggleSidebar } = useSidebar();
  const isMobile = useIsMobile();
  const [isHovering, setIsHovering] = useState(false);
  return (
    <SidebarMenuItem
      key={id}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      <SidebarMenuButton
        asChild
        className="py-5"
        style={{
          WebkitMaskImage: "linear-gradient(to right, black 75%, transparent)",
          maskImage: "linear-gradient(to right, black 75%, transparent)",
        }}
        onClick={() => {
          if (isMobile) {
            toggleSidebar();
          }
        }}
      >
        <Link
          href={`/chat/${id}`}
          className={cn(
            "font-medium whitespace-nowrap",
            pathname.endsWith(id) && "bg-primary/10",
          )}
        >
          {title}
        </Link>
      </SidebarMenuButton>
      {isHovering && (
        <div
          className="bg-sidebar absolute top-0 right-0 flex h-full items-center
          justify-end pl-6"
          style={{
            WebkitMaskImage: "linear-gradient(to left, black 75%, transparent)",
            maskImage: "linear-gradient(to left, black 75%, transparent)",
          }}
        >
          <Button variant="destructive" size="icon" onClick={handleDelete}>
            <Trash className="h-4 w-4" />
          </Button>
        </div>
      )}
    </SidebarMenuItem>
  );
}
