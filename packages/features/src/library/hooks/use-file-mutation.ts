import { useMutation } from "@tanstack/react-query";
import { useConvexMutation } from "@convex-dev/react-query";
import { toast } from "sonner";

import type { Doc } from "@acme/db/model";
import { api } from "@acme/db/api";

export function useFileMutation() {
  const deleteFilesMutation = useMutation({
    mutationFn: useConvexMutation(api.app.library.deleteFiles),
    onError: (error) => {
      console.error(error);
      toast.error("Failed to delete file");
    },
  });

  const renameFileMutation = useMutation({
    mutationFn: useConvexMutation(api.app.library.renameFile),
    onError: (error) => {
      console.error(error);
      toast.error("Failed to rename file");
    },
  });

  async function deleteFile(fileId: Doc<"files">["_id"]) {
    await deleteFilesMutation.mutateAsync({ ids: [fileId] });
  }

  async function deleteFiles(fileIds: Doc<"files">["_id"][]) {
    await deleteFilesMutation.mutateAsync({ ids: fileIds });
  }

  async function renameFile(fileId: Doc<"files">["_id"], name: string) {
    await renameFileMutation.mutateAsync({ id: fileId, name });
  }

  return { deleteFile, deleteFiles, renameFile };
}
