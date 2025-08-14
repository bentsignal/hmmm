import { memo } from "react";
import equal from "fast-deep-equal";
import { useFileInteraction } from "../hooks/use-file-interaction";
import { getFileType } from "../lib";
import { LibraryFile, LibraryMode } from "../types/library-types";
import { LibraryFileIcon } from "./library-file-icon";
import { cn } from "@/lib/utils";

interface LibraryFileProps {
  file: LibraryFile;
  mode: LibraryMode;
  selected: boolean;
}

const PureLibraryGridFile = ({ file, mode, selected }: LibraryFileProps) => {
  const fileType = getFileType(file.mimeType);

  const { handleFileClick, handleFileHover } = useFileInteraction();

  return (
    <div
      onClick={() => handleFileClick(file, mode, selected)}
      onMouseEnter={() => handleFileHover(file, mode)}
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
        {fileType === "image" ? (
          <img
            src={file.url}
            alt={file.fileName ?? "unnamed file"}
            className="h-full w-full rounded-xl object-cover"
          />
        ) : (
          <LibraryFileIcon fileType={fileType} className="h-10 w-10" />
        )}
      </div>
      <div className="flex w-full flex-1 flex-col items-center justify-center gap-1">
        <span className="line-clamp-2 w-[80%] text-center text-sm font-medium">
          {file.fileName ?? "unnamed file"}
        </span>
      </div>
    </div>
  );
};

const PureLibraryListFile = ({ file, mode, selected }: LibraryFileProps) => {
  const fileType = getFileType(file.mimeType);

  const { handleFileClick, handleFileHover } = useFileInteraction();

  return (
    <div
      onClick={() => handleFileClick(file, mode, selected)}
      onMouseEnter={() => handleFileHover(file, mode)}
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
        {fileType === "image" ? (
          <img
            src={file.url}
            alt={file.fileName ?? "unnamed file"}
            className="h-full w-full rounded-md object-cover"
          />
        ) : (
          <LibraryFileIcon fileType={fileType} className="h-5 w-5" />
        )}
      </div>
      <div className="flex flex-col gap-1">
        <span className="line-clamp-1 text-sm font-medium">
          {file.fileName ?? "unnamed file"}
        </span>
      </div>
    </div>
  );
};

export const LibraryGridFile = memo(PureLibraryGridFile, (prev, next) => {
  return (
    equal(prev.file, next.file) &&
    prev.mode === next.mode &&
    prev.selected === next.selected
  );
});

export const LibraryListFile = memo(PureLibraryListFile, (prev, next) => {
  return (
    equal(prev.file, next.file) &&
    prev.mode === next.mode &&
    prev.selected === next.selected
  );
});
