import { useFileMutation } from "../hooks/use-file-mutation";
import { useLibraryStore } from "../store/library-store";
import CustomAlert from "@/components/alert";

export const LibraryDeleteModal = () => {
  const libraryDeleteModalOpen = useLibraryStore(
    (state) => state.libraryDeleteModalOpen,
  );
  const setLibraryDeleteModalOpen = useLibraryStore(
    (state) => state.setLibraryDeleteModalOpen,
  );

  const setSelectedFile = useLibraryStore((state) => state.setSelectedFile);

  const { deleteFile } = useFileMutation();

  return (
    <CustomAlert
      open={libraryDeleteModalOpen}
      setOpen={setLibraryDeleteModalOpen}
      onCancel={() => {
        setSelectedFile(null);
      }}
      onConfirm={() => {
        const selectedFile = useLibraryStore.getState().selectedFile;
        if (selectedFile) {
          deleteFile(selectedFile);
          setSelectedFile(null);
          setLibraryDeleteModalOpen(false);
        }
      }}
      title="Delete File"
      message="Are you sure you want to delete this file?"
      destructive={true}
    />
  );
};
