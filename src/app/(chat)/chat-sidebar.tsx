"use client";

import { useRef } from "react";
import { Cog } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
} from "@/components/ui/sidebar";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { LibraryButton } from "@/features/library/components/library-trigger-button";
import { shortcuts } from "@/features/shortcuts";
import useShortcut from "@/features/shortcuts/hooks/use-shortcut";
import NewThreadButton from "@/features/thread/components/new-thread-button";
import ThreadDeleteModal from "@/features/thread/components/thread-delete-modal";
import ThreadList from "@/features/thread/components/thread-list";
import ThreadRenameModal from "@/features/thread/components/thread-rename-modal";
import useThreadList from "@/features/thread/hooks/use-thread-list";

// import useThreadSwitch from "@/features/thread/hooks/use-thread-switch";

export default function ChatSidebar() {
  const searchRef = useRef<HTMLInputElement>(null);

  const {
    threads,
    threadGroups,
    setSearch,
    loadMoreThreads,
    status,
    loaderId,
  } = useThreadList();

  // switch between threads with tab and shift tab
  // useThreadSwitch({
  //   threads,
  // });

  // focus search on "ctrl/cmd + shift + ?"
  useShortcut({
    hotkey: shortcuts["search"].hotkey,
    callback: () => {
      if (searchRef.current) {
        searchRef.current.focus();
      }
    },
  });

  const loadingFirstPage = status === "LoadingFirstPage";
  const noThreads = threads.length === 0 && !loadingFirstPage;

  return (
    <Sidebar variant="floating" className="py-4 pr-0 pl-4 select-none">
      <SidebarHeader className="md:px-auto flex flex-row items-center justify-between px-4 pt-4 md:pt-4">
        <Input
          placeholder="Search"
          className=" w-full"
          onChange={(e) => setSearch(e.target.value)}
          ref={searchRef}
        />
        <SettingsButton />
        <LibraryButton />
        <NewThreadButton />
      </SidebarHeader>
      <SidebarContent
        className="scrollbar-thin scrollbar-thumb-secondary 
        scrollbar-track-transparent overflow-y-auto"
      >
        <SidebarMenu>
          <ThreadList
            threadGroups={threadGroups}
            status={status}
            loadMore={loadMoreThreads}
            noThreads={noThreads}
            loaderId={loaderId}
          />
        </SidebarMenu>
        <ThreadDeleteModal />
        <ThreadRenameModal />
      </SidebarContent>
    </Sidebar>
  );
}

const SettingsButton = () => {
  const router = useRouter();
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="outline"
          onClick={() => router.push("/settings/general")}
          size="icon"
        >
          <Cog className="h-4 w-4" />
        </Button>
      </TooltipTrigger>
      <TooltipContent>Settings</TooltipContent>
    </Tooltip>
  );
};
