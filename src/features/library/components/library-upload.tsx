import { Upload } from "lucide-react";
import { toast } from "sonner";
import { WaveLoader } from "@/components/ui/loader";
import { UploadButton } from "@/lib/uploadthing";

export const LibraryUpload = () => {
  return (
    <UploadButton
      endpoint="uploadRoute"
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
        button:
          "bg-primary text-primary-foreground! hover:bg-primary/90 w-full text-sm font-bold",
      }}
      onUploadError={(error: Error) => {
        console.error(error);
        toast.error(error.message);
      }}
    />
  );
};
