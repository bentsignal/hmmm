import { Loader2, Upload as UploadIcon } from "lucide-react";
import { useLibraryUpload } from "../hooks/use-library-upload";
import { Button } from "@/components/ui/button";

export const LibraryUpload = () => {
  const { fileInputRef, isUploading, handleUpload } = useLibraryUpload();

  return (
    <div className="m-4">
      <input
        ref={fileInputRef}
        type="file"
        multiple
        onChange={handleUpload}
        className="hidden"
      />
      <Button
        onClick={() => fileInputRef.current?.click()}
        className="w-full items-center gap-2"
      >
        {isUploading ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : (
          <>
            <UploadIcon className="h-5 w-5" />
            <span className="text-md font-semibold">Upload</span>
          </>
        )}
      </Button>
    </div>
  );
};
