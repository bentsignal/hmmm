import { FileIcon } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { LibraryListFile } from "@/features/library/components/library-file";
import { LibraryFile } from "@/features/library/types";

export const MessageFiles = ({ files }: { files: LibraryFile[] }) => {
  if (files.length === 0) {
    return null;
  }
  return (
    <Sheet>
      <SheetTrigger>
        <div className="mb-3 w-full cursor-pointer select-none">
          <div className="bg-card flex w-fit items-center gap-2 rounded-full px-4 py-2">
            <FileIcon className="h-4 w-4" />
            <span className="text-muted-foreground text-sm font-bold">
              Analyzed {files.length} file{files.length > 1 ? "s" : ""}
            </span>
          </div>
        </div>
      </SheetTrigger>
      <SheetContent className="z-150 w-2xl max-w-screen overflow-y-auto md:max-w-lg">
        <div className="flex flex-col gap-4 px-8 py-12">
          {files.map((file) => (
            <LibraryListFile
              key={file.id}
              file={file}
              mode="default"
              selected={false}
            />
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
};
