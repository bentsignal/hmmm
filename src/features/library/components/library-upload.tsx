import { toast } from "sonner";
import { WaveLoader } from "@/components/ui/loader";
import { UploadButton } from "@/lib/uploadthing";

export const LibraryUpload = () => {
  return (
    <div className="m-4">
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
              return <span className="">Upload</span>;
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
          toast.error("Error uploading files");
        }}
      />
    </div>
  );
};
