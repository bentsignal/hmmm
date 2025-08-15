import { Upload } from "lucide-react";
import { toast } from "sonner";
import { useConvexAuth, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { LibraryStorageStatus } from "./library-storage-status";
import { WaveLoader } from "@/components/ui/loader";
import { UploadButton } from "@/lib/uploadthing";

export const LibraryUpload = () => {
  const isAuthenticated = useConvexAuth();
  const storageStatus = useQuery(
    api.library.library_queries.getStorageStatus,
    isAuthenticated ? {} : "skip",
  );

  if (!storageStatus) return null;

  const percentageUsed = Math.min(
    (storageStatus?.storageUsed ?? 0) / (storageStatus?.storageLimit ?? 0),
    100,
  );
  const disabled = storageStatus?.storageLimit === 0 || percentageUsed >= 100;

  return (
    <div className="m-4 flex flex-col gap-4">
      <LibraryStorageStatus
        storageUsed={storageStatus?.storageUsed ?? 0}
        storageLimit={storageStatus?.storageLimit ?? 0}
        percentageUsed={percentageUsed}
      />
      <UploadButton
        endpoint="uploadRoute"
        disabled={disabled}
        content={{
          button({ ready, isUploading }) {
            if (isUploading) {
              return (
                <WaveLoader
                  className=" h-5 w-5"
                  bgColor="bg-primary-foreground"
                />
              );
            }
            if (ready) {
              return (
                <div className="flex items-center gap-2">
                  <Upload className="h-4 w-4" />
                  <span className="text-sm font-bold">Upload</span>
                </div>
              );
            }
          },
          allowedContent: " ",
        }}
        appearance={{
          button: disabled
            ? "bg-muted text-muted-foreground! w-full text-sm font-bold cursor-not-allowed! select-none"
            : "bg-primary text-primary-foreground! hover:bg-primary/90 w-full text-sm font-bold",
        }}
        onUploadError={(error: Error) => {
          console.error(error);
          toast.error(error.message);
        }}
      />
    </div>
  );
};
