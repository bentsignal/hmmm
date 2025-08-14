import { memo } from "react";
import { Doc } from "@/convex/_generated/dataModel";
import { getFileType } from "../lib";
import { useLibraryStore } from "../store/library-store";
import { LibraryMode } from "../types/library-types";
import { LibraryFileIcon } from "./library-file-icon";
import { cn } from "@/lib/utils";

interface LibraryFileProps {
  id: Doc<"files">["_id"];
  url: string;
  fileName?: string;
  fileType?: string;
  mode: LibraryMode;
  selected: boolean;
}

const PureLibraryGridFile = ({
  id,
  url,
  fileName,
  fileType,
  mode,
  selected,
}: LibraryFileProps) => {
  const setSelectedFile = useLibraryStore((state) => state.setSelectedFile);
  const setSelectedFiles = useLibraryStore((state) => state.setSelectedFiles);
  const type = getFileType(fileType);

  return (
    <div
      onClick={() => {
        if (mode === "select") {
          const selectedFiles = useLibraryStore.getState().selectedFiles;
          if (selected) {
            setSelectedFiles(selectedFiles.filter((file) => file !== id));
          } else {
            setSelectedFiles([...selectedFiles, id]);
          }
        } else {
          window.open(url, "_blank");
        }
      }}
      onMouseEnter={() => {
        if (mode === "default") {
          setSelectedFile(id);
        }
      }}
      className={cn(
        "bg-card hover:bg-card/80 relative flex w-full flex-col items-center gap-4 rounded-lg p-4 shadow-sm transition-all select-none hover:cursor-pointer",
        mode === "select" && !selected && "opacity-50",
      )}
    >
      {mode === "select" && (
        <div
          className={cn(
            "absolute top-2 right-2 z-10 h-3 w-3 rounded-full",
            selected ? "bg-primary" : "border-primary border",
          )}
        ></div>
      )}
      <div className="relative flex h-40 w-full items-center justify-center sm:h-20">
        {type === "image" ? (
          <img
            src={url}
            alt={fileName ?? "unnamed file"}
            className="h-full w-full rounded-xl object-cover"
          />
        ) : (
          <LibraryFileIcon fileType={type} className="h-10 w-10" />
        )}
      </div>
      <div className="flex w-full flex-1 flex-col items-center justify-center gap-1">
        <span className="line-clamp-2 w-[80%] text-center text-sm font-medium">
          {fileName ?? "unnamed file"}
        </span>
      </div>
    </div>
  );
};

const PureLibraryListFile = ({
  id,
  url,
  fileName,
  fileType,
  mode,
  selected,
}: LibraryFileProps) => {
  const type = getFileType(fileType);
  const setSelectedFile = useLibraryStore((state) => state.setSelectedFile);
  const setSelectedFiles = useLibraryStore((state) => state.setSelectedFiles);

  return (
    <div
      onClick={() => {
        if (mode === "select") {
          const selectedFiles = useLibraryStore.getState().selectedFiles;
          if (selected) {
            setSelectedFiles(selectedFiles.filter((file) => file !== id));
          } else {
            setSelectedFiles([...selectedFiles, id]);
          }
        } else {
          window.open(url, "_blank");
        }
      }}
      onMouseEnter={() => {
        if (mode === "default") {
          setSelectedFile(id);
        }
      }}
      className={cn(
        "bg-card hover:bg-card/80 row relative flex w-full items-center gap-4 rounded-lg p-4 shadow-sm transition-all select-none hover:cursor-pointer",
        mode === "select" && !selected && "opacity-50",
      )}
    >
      {mode === "select" && (
        <div className="absolute top-0 right-0 z-10 flex h-full items-center justify-center">
          <div
            className={cn(
              "mx-4 h-3 w-3 rounded-full",
              selected ? "bg-primary" : "border-primary border",
            )}
          />
        </div>
      )}
      <div className="relative flex h-10 w-10 items-center justify-center">
        {type === "image" ? (
          <img
            src={url}
            alt={fileName ?? "unnamed file"}
            className="h-full w-full rounded-md object-cover"
          />
        ) : (
          <LibraryFileIcon fileType={type} className="h-5 w-5" />
        )}
      </div>
      <div className="flex flex-col gap-1">
        <span className="line-clamp-1 text-sm font-medium">
          {fileName ?? "unnamed file"}
        </span>
      </div>
    </div>
  );
};

export const LibraryGridFile = memo(PureLibraryGridFile, (prev, next) => {
  return (
    prev.id === next.id &&
    prev.url === next.url &&
    prev.fileName === next.fileName &&
    prev.fileType === next.fileType &&
    prev.mode === next.mode &&
    prev.selected === next.selected
  );
});

export const LibraryListFile = memo(PureLibraryListFile, (prev, next) => {
  return (
    prev.id === next.id &&
    prev.url === next.url &&
    prev.fileName === next.fileName &&
    prev.fileType === next.fileType &&
    prev.mode === next.mode &&
    prev.selected === next.selected
  );
});
