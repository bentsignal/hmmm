import { memo } from "react";
import { Doc } from "@/convex/_generated/dataModel";
import { getFileType } from "../lib";
import { useLibraryStore } from "../store/library-store";
import { LibraryFileIcon } from "./library-file-icon";

interface LibraryFileProps {
  id: Doc<"files">["_id"];
  url: string;
  fileName?: string;
  fileType?: string;
}

const PureLibraryGridFile = ({
  id,
  url,
  fileName,
  fileType,
}: LibraryFileProps) => {
  const { setSelectedFile } = useLibraryStore();
  const type = getFileType(fileType);
  return (
    <div
      onClick={() => {
        window.open(url, "_blank");
      }}
      onMouseEnter={() => {
        setSelectedFile(id);
      }}
      className="bg-card hover:bg-card/80 flex flex-col items-center gap-4 rounded-lg p-4 shadow-sm transition-colors select-none hover:cursor-pointer"
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
}: LibraryFileProps) => {
  const type = getFileType(fileType);
  const { setSelectedFile } = useLibraryStore();
  return (
    <div
      onClick={() => {
        window.open(url, "_blank");
      }}
      onMouseEnter={() => {
        setSelectedFile(id);
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
      </div>
    </div>
  );
};

export const LibraryGridFile = memo(PureLibraryGridFile, (prev, next) => {
  return (
    prev.id === next.id &&
    prev.url === next.url &&
    prev.fileName === next.fileName &&
    prev.fileType === next.fileType
  );
});

export const LibraryListFile = memo(PureLibraryListFile, (prev, next) => {
  return (
    prev.id === next.id &&
    prev.url === next.url &&
    prev.fileName === next.fileName &&
    prev.fileType === next.fileType
  );
});
