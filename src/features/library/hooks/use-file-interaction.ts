import { useLibraryStore } from "../store/library-store";
import { LibraryFile, LibraryMode } from "../types/library-types";

export const useFileInteraction = () => {
  const setSelectedFiles = useLibraryStore((state) => state.setSelectedFiles);
  const setSelectedFile = useLibraryStore((state) => state.setSelectedFile);

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

  return { handleFileClick, handleFileHover };
};
