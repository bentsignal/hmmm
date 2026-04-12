import { useLocation, useNavigate } from "@tanstack/react-router";

import CustomAlert from "~/components/alert";
import useThreadStore from "~/features/thread/store";
import useThreadMutation from "../hooks/use-thread-mutation";

export default function ThreadDeleteModal() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { deleteThread } = useThreadMutation();
  const setHoveredThread = useThreadStore((state) => state.setHoveredThread);
  const deleteModalOpen = useThreadStore((state) => state.deleteModalOpen);
  const setDeleteModalOpen = useThreadStore(
    (state) => state.setDeleteModalOpen,
  );
  return (
    <CustomAlert
      open={deleteModalOpen}
      setOpen={setDeleteModalOpen}
      onCancel={() => {
        setHoveredThread(null);
      }}
      onConfirm={() => {
        const selectedThread = useThreadStore.getState().hoveredThread;
        if (!selectedThread) return;
        if (pathname.includes(selectedThread.id)) {
          void navigate({ to: "/" });
        }
        deleteThread({ threadId: selectedThread.id });
        setHoveredThread(null);
      }}
      title="Delete Thread"
      message="Are you sure you want to delete this thread?"
      destructive={true}
    />
  );
}
