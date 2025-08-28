import { useState } from "react";
import { toast } from "sonner";
import { useLibraryStore } from "../store";
import { LibraryFile, LibraryMode } from "../types";
import { tryCatch } from "@/lib/utils";
import useComposerStore from "@/features/composer/store";

export const useFileInteraction = () => {
  const [isDownloading, setIsDownloading] = useState(false);
  const setSelectedFiles = useLibraryStore((state) => state.setSelectedFiles);
  const setSelectedFile = useLibraryStore((state) => state.setSelectedFile);
  const addAttachments = useComposerStore((state) => state.addAttachments);
  const setLibraryOpen = useLibraryStore((state) => state.setLibraryOpen);
  const setPhotoViewerOpen = useLibraryStore(
    (state) => state.setPhotoViewerOpen,
  );

  const handleFileClick = (
    file: LibraryFile,
    mode: LibraryMode,
    selected: boolean,
  ) => {
    if (mode === "select") {
      const selectedFiles = useLibraryStore.getState().selectedFiles;
      if (selected) {
        setSelectedFiles(selectedFiles.filter((f) => f.id !== file.id));
      } else {
        const dedupedFiles = selectedFiles.filter((f) => f.id !== file.id);
        setSelectedFiles([...dedupedFiles, file]);
      }
    } else {
      if (file.mimeType.startsWith("image/")) {
        setPhotoViewerOpen(true);
      } else {
        window.open(file.url, "_blank");
      }
    }
  };

  const handleFileHover = (file: LibraryFile, mode: LibraryMode) => {
    if (mode === "default") {
      setSelectedFile(file);
    }
  };

  const handleAddAttachment = (file: LibraryFile) => {
    const { errors } = addAttachments([file]);
    if (errors.length > 0) {
      for (const error of errors) {
        toast.error(error);
      }
    }
    setLibraryOpen(false);
  };

  const download = async (urls: string[]) => {
    if (isDownloading) {
      throw new Error("Already downloading files");
    }
    if (urls.length === 0) {
      throw new Error("No files to download");
    }
    setIsDownloading(true);
    const { error } = await tryCatch(
      Promise.all(
        urls.map(async (url) => {
          const res = await fetch(url);
          const blob = await res.blob();
          const localUrl = window.URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = localUrl;
          const path = new URL(url).pathname.split("/").pop();
          if (!path) {
            throw new Error("Invalid URL");
          }
          a.download = path;
          a.click();
          window.URL.revokeObjectURL(localUrl);
        }),
      ),
    );
    setIsDownloading(false);
    if (error) {
      console.error("Failed to download files", error);
      throw new Error("Failed to download files");
    }
  };

  return { handleFileClick, handleFileHover, handleAddAttachment, download };
};
