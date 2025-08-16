"use client";

import { useState } from "react";
import {
  File as FileIcon,
  Image as ImageIcon,
  Library as LibraryIcon,
  LucideIcon,
} from "lucide-react";
import { LibraryBulkToolbar } from "./components/library-bulk-toolbar";
import { LibraryDeleteModal } from "./components/library-delete-modal";
import { LibraryFileList } from "./components/library-file-list";
import { LibraryRenameModal } from "./components/library-rename-modal";
import { LibraryToolbar } from "./components/library-toolbar";
import { LibraryUpload } from "./components/library-upload";
import { useLibraryStore } from "./store";
import { LibrarySort, LibraryTab, LibraryView } from "./types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import useDebouncedInput from "@/hooks/use-debounced-input";

const tabs: { label: string; value: LibraryTab; icon: LucideIcon }[] = [
  {
    label: "All Files",
    value: "all",
    icon: LibraryIcon,
  },
  {
    label: "Images",
    value: "images",
    icon: ImageIcon,
  },
  {
    label: "Documents",
    value: "documents",
    icon: FileIcon,
  },
];

export default function Library() {
  const libraryOpen = useLibraryStore((state) => state.libraryOpen);
  const setLibraryOpen = useLibraryStore((state) => state.setLibraryOpen);
  const setLibraryMode = useLibraryStore((state) => state.setLibraryMode);

  const [activeTab, setActiveTab] = useState<LibraryTab>(tabs[0].value);
  const [view, setView] = useState<LibraryView>("grid");
  const [sort, setSort] = useState<LibrarySort>("date");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const { setValue: setSearch, debouncedValue: searchTerm } =
    useDebouncedInput(500);

  return (
    <>
      <LibraryDeleteModal />
      <LibraryRenameModal />
      <Dialog
        open={libraryOpen}
        onOpenChange={(open) => {
          setLibraryOpen(open);
          if (!open) {
            setLibraryMode("default");
          }
        }}
      >
        <DialogContent
          showCloseButton={false}
          className="h-full max-h-[600px] border-none bg-transparent md:max-w-[700px] xl:max-w-[900px]"
        >
          <DialogHeader className="sr-only">
            <DialogTitle>Library</DialogTitle>
            <DialogDescription>
              Your library of files and documents.
            </DialogDescription>
          </DialogHeader>
          <div className="flex">
            <div className="bg-card supports-[backdrop-filter]:bg-card/80 flex h-full w-fit max-w-50 flex-col justify-between rounded-xl rounded-r-none border border-r-0 backdrop-blur">
              <div className="flex flex-col gap-2 p-4">
                {tabs.map((tab) => (
                  <Button
                    key={tab.label}
                    variant="ghost"
                    className={cn(
                      "w-full justify-start gap-2",
                      activeTab === tab.value && "bg-card text-primary",
                    )}
                    onClick={() => setActiveTab(tab.value)}
                  >
                    <tab.icon className="h-5 w-5" />
                    <span className="text-md font-semibold">{tab.label}</span>
                  </Button>
                ))}
              </div>
              <LibraryUpload />
            </div>
            <div className="bg-background relative flex h-full flex-1 flex-col rounded-xl rounded-l-none border border-l-0">
              <LibraryToolbar
                view={view}
                setView={setView}
                setSort={setSort}
                setSortDirection={setSortDirection}
                setSearchTerm={setSearch}
              />
              <div className="max-h-[500px] min-h-[500px] flex-1 overflow-y-auto px-4 pb-4">
                <LibraryFileList
                  view={view}
                  sort={sort}
                  sortDirection={sortDirection}
                  searchTerm={searchTerm}
                  tab={activeTab}
                />
              </div>
              <div className="absolute right-0 bottom-0 left-0 flex w-full items-center justify-center">
                <LibraryBulkToolbar />
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
