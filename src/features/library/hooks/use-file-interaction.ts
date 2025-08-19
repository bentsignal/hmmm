import { toast } from "sonner";
import { useLibraryStore } from "../store";
import { LibraryFile, LibraryMode } from "../types";
import useComposerStore from "@/features/composer/store";

export const useFileInteraction = () => {
  const setSelectedFiles = useLibraryStore((state) => state.setSelectedFiles);
  const setSelectedFile = useLibraryStore((state) => state.setSelectedFile);
  const addAttachments = useComposerStore((state) => state.addAttachments);
  const setLibraryOpen = useLibraryStore((state) => state.setLibraryOpen);

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
      window.open(file.url, "_blank");
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

  return { handleFileClick, handleFileHover, handleAddAttachment };
};
