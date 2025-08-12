import { memo } from "react";
import { getFileSize, getFileType } from "../lib";
import { LibraryFileIcon } from "./library-file-icon";

interface LibraryFileProps {
  url: string;
  fileName?: string;
  fileType?: string;
  size?: number;
}

const PureLibraryGridFile = ({
  url,
  fileName,
  fileType,
  size,
}: LibraryFileProps) => {
  const type = getFileType(fileType);
  return (
    <div
      onClick={() => {
        window.open(url, "_blank");
      }}
      className="bg-card hover:bg-card/80 flex h-fit flex-col items-center gap-4 rounded-lg p-4 shadow-sm transition-colors select-none hover:cursor-pointer"
    >
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
      <div className="flex w-full flex-col items-center justify-center gap-1">
        <span className="line-clamp-1 text-center text-sm font-medium">
          {fileName ?? "unnamed file"}
        </span>
        <span className="text-muted-foreground hidden text-sm">
          {getFileSize(size)}
        </span>
      </div>
    </div>
  );
};

const PureLibraryListFile = ({
  url,
  fileName,
  fileType,
  size,
}: LibraryFileProps) => {
  const type = getFileType(fileType);
  return (
    <div
      onClick={() => {
        window.open(url, "_blank");
      }}
      className="bg-card hover:bg-card/80 row flex items-center gap-4 rounded-lg p-4 shadow-sm transition-colors select-none hover:cursor-pointer"
    >
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
        <span className="text-muted-foreground hidden text-sm">
          {getFileSize(size)}
        </span>
      </div>
    </div>
  );
};

export const LibraryGridFile = memo(PureLibraryGridFile, (prev, next) => {
  return (
    prev.url === next.url &&
    prev.fileName === next.fileName &&
    prev.fileType === next.fileType &&
    prev.size === next.size
  );
});

export const LibraryListFile = memo(PureLibraryListFile, (prev, next) => {
  return (
    prev.url === next.url &&
    prev.fileName === next.fileName &&
    prev.fileType === next.fileType &&
    prev.size === next.size
  );
});
