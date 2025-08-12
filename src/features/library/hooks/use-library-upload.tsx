import { useRef, useState } from "react";
import { useUploadFile } from "@convex-dev/r2/react";
import { toast } from "sonner";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { MAX_FILE_UPLOADS } from "../config";
import { tryCatch } from "@/lib/utils";

export const useLibraryUpload = () => {
  const uploadFile = useUploadFile(api.r2);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const uploadFileMetadata = useMutation(
    api.library.library_mutations.uploadFileMetadata,
  );

  const uploadFiles = async (files: File[]) => {
    // upload files
    const { data: keys, error: fileUploadError } = await tryCatch(
      Promise.all(files.map(uploadFile)),
    );
    if (fileUploadError) {
      console.error("Failed to upload files");
      throw new Error("Failed to upload files");
    }

    // upload metadata
    const fileNames = files.map((file) => file.name);
    const keysAndNames =
      keys && fileNames
        ? keys.map((key, idx) => ({
            key,
            name: fileNames[idx],
          }))
        : [];
    const { error: metadataUploadError } = await tryCatch(
      uploadFileMetadata({
        files: keysAndNames,
      }),
    );
    if (metadataUploadError) {
      console.error("Failed to upload file metadata");
      throw new Error("Failed to upload file metadata");
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    // input validation
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;
    if (files.length > MAX_FILE_UPLOADS) {
      toast.error(`Can't upload more than ${MAX_FILE_UPLOADS} files at a time`);
      return;
    }

    // upload files and metadata
    setIsUploading(true);
    const { error: uploadError } = await tryCatch(uploadFiles(files));
    if (uploadError) {
      toast.error("Failed to upload files");
    }
    setIsUploading(false);

    e.target.value = "";
  };

  return {
    fileInputRef,
    isUploading,
    handleUpload,
  };
};
