import { useLibraryStore } from "../store/library-store";
import { LibraryFile, LibraryMode } from "../types/library-types";
import useComposerStore from "@/features/composer/store/composer-store";

export const useFileInteraction = () => {
  const setSelectedFiles = useLibraryStore((state) => state.setSelectedFiles);
  const setSelectedFile = useLibraryStore((state) => state.setSelectedFile);
  const addAttachment = useComposerStore((state) => state.addAttachment);
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
    addAttachment(file);
    setLibraryOpen(false);
  };

  return { handleFileClick, handleFileHover, handleAddAttachment };
};
