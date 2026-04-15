import { Activity, useState } from "react";
import { LegendList } from "@legendapp/list/react";
import { useConvexAuth, usePaginatedQuery } from "convex/react";

import type {
  LibraryFile,
  LibraryMode,
  LibrarySort,
  LibraryTab,
  LibraryView,
} from "@acme/features/library";
import { api } from "@acme/db/api";
import { libraryPagination, useLibraryStore } from "@acme/features/library";
import { ContextMenu, ContextMenuTrigger } from "@acme/ui/context-menu";
import { Loader } from "@acme/ui/loader";

import { useScreenSize } from "~/hooks/use-screen-size";
import { LibraryGridFile, LibraryListFile } from "./library-file";
import { LibraryFileContextItems } from "./library-file-context-items";

type PaginatedStatus =
  | "LoadingFirstPage"
  | "LoadingMore"
  | "CanLoadMore"
  | "Exhausted";

function useGridColumnCount() {
  const screenSize = useScreenSize();
  if (screenSize === "mobile") return 1;
  if (screenSize === "tablet") return 3;
  return 4;
}

interface FileListViewProps {
  files: LibraryFile[];
  status: PaginatedStatus;
  loadMore: (numItems: number) => void;
  libraryMode: LibraryMode;
  selectedFiles: LibraryFile[];
}

function GridFileList({
  files,
  status,
  loadMore,
  libraryMode,
  selectedFiles,
}: FileListViewProps) {
  const numColumns = useGridColumnCount();
  const [visible, setVisible] = useState(false);

  return (
    <LegendList
      data={files}
      keyExtractor={(item: LibraryFile) => `${numColumns}-${item.id}`}
      estimatedItemSize={180}
      numColumns={numColumns}
      recycleItems
      extraData={{ libraryMode, selectedFiles }}
      onEndReached={() => {
        if (status === "CanLoadMore") {
          loadMore(libraryPagination.pageSize);
        }
      }}
      onEndReachedThreshold={2}
      onLoad={() => setVisible(true)}
      style={{
        flex: 1,
        minHeight: 0,
        opacity: visible ? 1 : 0,
        transition: "opacity 300ms ease",
      }}
      renderItem={({ item }) => (
        <div className="p-2">
          <LibraryGridFile
            file={item}
            mode={libraryMode}
            selected={selectedFiles.some((f) => f.id === item.id)}
          />
        </div>
      )}
    />
  );
}

function ListFileList({
  files,
  status,
  loadMore,
  libraryMode,
  selectedFiles,
}: FileListViewProps) {
  const [visible, setVisible] = useState(false);

  return (
    <LegendList
      data={files}
      keyExtractor={(item: LibraryFile) => item.id}
      estimatedItemSize={88}
      recycleItems
      extraData={{ libraryMode, selectedFiles }}
      onEndReached={() => {
        if (status === "CanLoadMore") {
          loadMore(libraryPagination.pageSize);
        }
      }}
      onEndReachedThreshold={2}
      onLoad={() => setVisible(true)}
      style={{
        flex: 1,
        minHeight: 0,
        opacity: visible ? 1 : 0,
        transition: "opacity 300ms ease",
      }}
      renderItem={({ item }) => (
        <div className="py-1">
          <LibraryListFile
            file={item}
            mode={libraryMode}
            selected={selectedFiles.some((f) => f.id === item.id)}
          />
        </div>
      )}
    />
  );
}

export function LibraryFileList({
  view,
  sort,
  sortDirection,
  searchTerm,
  tab,
}: {
  view: LibraryView;
  sort: LibrarySort;
  sortDirection: "asc" | "desc";
  searchTerm: string;
  tab: LibraryTab;
}) {
  const { isAuthenticated } = useConvexAuth();
  const args = isAuthenticated
    ? {
        direction: sortDirection,
        tab,
        sort,
        searchTerm: searchTerm.trim().length > 0 ? searchTerm : undefined,
      }
    : "skip";
  const {
    results: files,
    status,
    loadMore,
  } = usePaginatedQuery(api.app.library.getUserFiles, args, {
    initialNumItems: libraryPagination.initialSize,
  });

  const libraryMode = useLibraryStore((state) => state.libraryMode);
  const selectedFiles = useLibraryStore((state) => state.selectedFiles);

  if (status === "LoadingFirstPage") {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <Loader size="sm" variant="dots" />
      </div>
    );
  }

  if (status === "Exhausted" && files.length === 0) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <p>No files found</p>
      </div>
    );
  }

  const viewProps = {
    files,
    status,
    loadMore,
    libraryMode,
    selectedFiles,
  } satisfies FileListViewProps;

  return (
    <ContextMenu>
      <ContextMenuTrigger className="flex min-h-0 flex-1 flex-col">
        <Activity mode={view === "grid" ? "visible" : "hidden"}>
          <GridFileList {...viewProps} />
        </Activity>
        <Activity mode={view === "list" ? "visible" : "hidden"}>
          <ListFileList {...viewProps} />
        </Activity>
      </ContextMenuTrigger>
      <LibraryFileContextItems />
    </ContextMenu>
  );
}
