import { useConvexMutation } from "@convex-dev/react-query";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
import { Doc } from "@/convex/_generated/dataModel";

export const useFileMutation = () => {
  const deleteFilesMutation = useMutation({
    mutationFn: useConvexMutation(api.library.library_mutations.deleteFiles),
    onError: (error) => {
      console.error(error);
      toast.error("Failed to delete file");
    },
  });

  const renameFileMutation = useMutation({
    mutationFn: useConvexMutation(api.library.library_mutations.renameFile),
    onError: (error) => {
      console.error(error);
      toast.error("Failed to rename file");
    },
  });

  const deleteFile = async (fileId: Doc<"files">["_id"]) => {
    await deleteFilesMutation.mutateAsync({ ids: [fileId] });
  };

  const deleteFiles = async (fileIds: Doc<"files">["_id"][]) => {
    await deleteFilesMutation.mutateAsync({ ids: fileIds });
  };

  const renameFile = async (fileId: Doc<"files">["_id"], name: string) => {
    await renameFileMutation.mutateAsync({ id: fileId, name });
  };

  return { deleteFile, deleteFiles, renameFile };
};
