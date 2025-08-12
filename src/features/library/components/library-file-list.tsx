import { useConvexAuth, usePaginatedQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { LibrarySort, LibrarySortDirection, LibraryView } from "../types";
import { LibraryGridFile, LibraryListFile } from "./library-file";
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
  sortDirection: LibrarySortDirection;
  searchTerm: string;
  tab: {
    label: string;
    value: string;
    icon: React.ElementType;
  };
}) => {
  const isAuthenticated = useConvexAuth();
  const args = isAuthenticated ? {} : "skip";
  const {
    results: files,
    status,
    loadMore,
  } = usePaginatedQuery(api.library.library_queries.listUserFiles, args, {
    initialNumItems: 100,
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
      <div className="grid h-[500px] grid-cols-1 gap-4 overflow-y-auto sm:grid-cols-3 xl:grid-cols-4">
        {files.map((file) => {
          if (!file) {
            return null;
          }
          return <LibraryGridFile key={file.url} {...file} />;
        })}
      </div>
    );
  }

  return (
    <div className="flex h-[500px] flex-col gap-4 overflow-y-auto">
      {files.map((file) => {
        if (!file) {
          return null;
        }
        return <LibraryListFile key={file.url} {...file} />;
      })}
    </div>
  );
};
