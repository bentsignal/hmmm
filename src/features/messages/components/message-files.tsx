import { ExternalLink } from "lucide-react";
import { FileResult } from "../types/message-types";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { LibraryFileIcon } from "@/features/library/components/library-file-icon";
import { getFileType } from "@/features/library/lib/library-util";

export const MessageFiles = ({ files }: { files: FileResult[] }) => {
  if (files.length === 0) {
    return null;
  }
  return (
    <Sheet>
      <SheetTrigger>
        <PreviewMessage files={files} />
      </SheetTrigger>
      <SheetContent className="z-150 w-2xl max-w-screen overflow-y-auto md:max-w-lg">
        <ExpandedMessageFiles files={files} />
      </SheetContent>
    </Sheet>
  );
};

const PreviewMessage = ({ files }: { files: FileResult[] }) => {
  return (
    <div
      className="mb-3 flex w-full cursor-pointer flex-col gap-2 transition-opacity delay-200 duration-500 select-none"
      style={{
        opacity: files.length > 0 ? 1 : 0,
      }}
    >
      <div className="bg-card flex w-fit items-center gap-3 rounded-full px-4 py-2">
        <span className="text-muted-foreground text-sm font-bold">
          Analyzed {files.length} file{files.length > 1 ? "s" : ""}
        </span>
      </div>
    </div>
  );
};

const ExpandedMessageFiles = ({ files }: { files: FileResult[] }) => {
  return (
    <div className="flex flex-col gap-4 px-8 py-12">
      {files.map((file) => {
        const fileType = getFileType(file.mimeType);
        return (
          <div
            key={file.id}
            className="flex items-center justify-between gap-2 rounded-lg border p-3 hover:cursor-pointer"
            onClick={() => {
              window.open(file.url, "_blank");
            }}
          >
            <div className="flex items-center gap-2">
              <LibraryFileIcon fileType={fileType} className="h-5 w-5" />
              <span className="text-sm font-medium">{file.fileName}</span>
            </div>
            <ExternalLink className="h-4 w-4" />
          </div>
        );
      })}
    </div>
  );
};
