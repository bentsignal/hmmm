import { useConvexAuth, usePaginatedQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { LibrarySort, LibrarySortDirection, LibraryView } from "../types";
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
    initialNumItems: 10,
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

  return files.map((file) => (
    <>
      {view === "grid" ? (
        <div key={file.url}>
          <span>{file.fileName ?? "unnamed grid file"}</span>
        </div>
      ) : (
        <div key={file.url}>
          <span>{file.fileName ?? "unnamed list file"}</span>
        </div>
      )}
    </>
  ));
};
