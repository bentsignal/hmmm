import { useMemo } from "react";
import { DownloadIcon, Image as ImageIcon, X } from "lucide-react";
import { useFileInteraction } from "../hooks/use-file-interaction";
import { useLibraryStore } from "../store";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const maxFileNameLength = 40;

export const LibraryPhotoViewer = () => {
  const photoViewerOpen = useLibraryStore((state) => state.photoViewerOpen);
  const setPhotoViewerOpen = useLibraryStore(
    (state) => state.setPhotoViewerOpen,
  );
  const selectedFile = useLibraryStore((state) => state.selectedFile);
  const { download } = useFileInteraction();

  const fileName = useMemo(() => {
    if (!selectedFile || !selectedFile.fileName.length) {
      return "Unnamed file";
    }
    if (selectedFile.fileName.length > maxFileNameLength) {
      return `${selectedFile.fileName.substring(0, maxFileNameLength)}...`;
    }
    return selectedFile.fileName;
  }, [selectedFile]);

  if (!selectedFile) {
    return null;
  }

  return (
    <Dialog open={photoViewerOpen} onOpenChange={setPhotoViewerOpen}>
      <DialogContent
        showCloseButton={false}
        className="z-200 border-none bg-transparent md:max-w-[700px] xl:max-w-[900px]"
      >
        <DialogHeader className="sr-only">
          <DialogTitle>Photo Viewer</DialogTitle>
        </DialogHeader>
        <div className="border-border bg-card supports-[backdrop-filter]:bg-card/50 flex max-h-[900px] flex-col gap-4 rounded-xl border-1 px-8 pt-5 pb-8 backdrop-blur-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ImageIcon className="h-5 w-5" />
              <span className="line-clamp-1 text-sm">{fileName}</span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => download([selectedFile.url])}
              >
                <DownloadIcon className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setPhotoViewerOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <img
            src={selectedFile.url}
            alt={fileName}
            className="h-full max-h-[800px] w-auto rounded-xl object-contain"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};
