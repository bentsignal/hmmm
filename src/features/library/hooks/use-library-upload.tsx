import { useRef, useState } from "react";
import { useUploadFile } from "@convex-dev/r2/react";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
import { tryCatch } from "@/lib/utils";

export const useLibraryUpload = () => {
  const uploadFile = useUploadFile(api.r2);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;
    setIsUploading(true);
    const { error } = await tryCatch(Promise.all(files.map(uploadFile)));
    if (error) {
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
