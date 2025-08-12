import { useConvexAuth, usePaginatedQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { LibrarySort, LibraryTab, LibraryView } from "../types";
import { LibraryGridFile, LibraryListFile } from "./library-file";
import { Button } from "@/components/ui/button";
import { WaveLoader } from "@/components/ui/loader";

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
        searchTerm,
      }
    : "skip";
  const {
    results: files,
    status,
    loadMore,
  } = usePaginatedQuery(api.library.library_queries.listUserFiles, args, {
    initialNumItems: 3,
  });

  if (status === "LoadingFirstPage" || status === "LoadingMore") {
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

  if (view === "grid") {
    return (
      <>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 xl:grid-cols-4">
          {files.map((file) => {
            if (!file) {
              return null;
            }
            return <LibraryGridFile key={file.url} {...file} />;
          })}
        </div>
        {status === "CanLoadMore" && (
          <div className="flex justify-center py-4">
            <Button onClick={() => loadMore(100)}>Load more</Button>
          </div>
        )}
      </>
    );
  }

  return (
    <>
      <div className="flex flex-col gap-4">
        {files.map((file) => {
          if (!file) {
            return null;
          }
          return <LibraryListFile key={file.url} {...file} />;
        })}
      </div>
      {status === "CanLoadMore" && (
        <div className="flex justify-center py-4">
          <Button onClick={() => loadMore(100)}>Load more</Button>
        </div>
      )}
      å
    </>
  );
};
