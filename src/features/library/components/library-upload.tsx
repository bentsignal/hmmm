import { Loader2, Upload as UploadIcon } from "lucide-react";
import { MAX_FILE_UPLOADS } from "../config";
import { useUpload } from "../hooks/use-upload";
import { Button } from "@/components/ui/button";

export const LibraryUpload = () => {
  const { fileInputRef, isUploading, handleUpload } = useUpload();

  return (
    <div className="m-4">
      <input
        ref={fileInputRef}
        type="file"
        multiple
        onChange={handleUpload}
        className="hidden"
        accept="image/jpeg,image/png,image/webp,application/pdf"
        max={MAX_FILE_UPLOADS}
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
