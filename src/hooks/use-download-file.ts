import { useState } from "react";
import { tryCatch } from "@/lib/utils";

export const useDownloadFile = () => {
  const [isDownloading, setIsDownloading] = useState(false);

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

  return {
    download,
    isDownloading,
  };
};
