import { useConvexAuth, usePaginatedQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useLibraryStore } from "../store";
import { LibrarySort, LibraryTab, LibraryView } from "../types";
import { LibraryGridFile, LibraryListFile } from "./library-file";
import { LibraryFileContextItems } from "./library-file-context-items";
import PageLoader from "@/components/page-loader";
import { ContextMenu, ContextMenuTrigger } from "@/components/ui/context-menu";
import { WaveLoader } from "@/components/ui/loader";
import { libraryPagination } from "@/features/library/config";

export const LibraryFileList = ({
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
}) => {
  const isAuthenticated = useConvexAuth();
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
  } = usePaginatedQuery(api.app.library.listUserFiles, args, {
    initialNumItems: libraryPagination.initialSize,
  });

  const libraryMode = useLibraryStore((state) => state.libraryMode);
  const selectedFiles = useLibraryStore((state) => state.selectedFiles);

  if (status === "LoadingFirstPage") {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <WaveLoader size="lg" />
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

  return (
    <ContextMenu>
      <ContextMenuTrigger>
        {view === "grid" ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 xl:grid-cols-4">
            {files.map((file, index) => {
              if (!file) {
                return null;
              }
              const activationIndex = Math.max(
                0,
                files.length - libraryPagination.loaderIndex,
              );
              if (index === activationIndex) {
                return (
                  <PageLoader
                    status={status}
                    loadMore={() => loadMore(libraryPagination.pageSize)}
                    singleUse={true}
                    key={file.url}
                  >
                    <LibraryGridFile
                      key={file.url}
                      file={file}
                      mode={libraryMode}
                      selected={selectedFiles.some((f) => f.id === file.id)}
                    />
                  </PageLoader>
                );
              }
              return (
                <LibraryGridFile
                  key={file.url}
                  file={file}
                  mode={libraryMode}
                  selected={selectedFiles.some((f) => f.id === file.id)}
                />
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {files.map((file, index) => {
              if (!file) {
                return null;
              }
              const activationIndex = Math.max(
                0,
                files.length - libraryPagination.loaderIndex,
              );
              if (index === activationIndex) {
                return (
                  <PageLoader
                    status={status}
                    loadMore={() => loadMore(libraryPagination.pageSize)}
                    singleUse={true}
                    key={file.url}
                  >
                    <LibraryListFile
                      key={file.url}
                      file={file}
                      mode={libraryMode}
                      selected={selectedFiles.some((f) => f.id === file.id)}
                    />
                  </PageLoader>
                );
              }
              return (
                <LibraryListFile
                  key={file.url}
                  file={file}
                  mode={libraryMode}
                  selected={selectedFiles.some((f) => f.id === file.id)}
                />
              );
            })}
          </div>
        )}
      </ContextMenuTrigger>
      <LibraryFileContextItems />
    </ContextMenu>
  );
};
