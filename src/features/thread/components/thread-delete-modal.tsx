import { usePathname, useRouter } from "next/navigation";
import useThreadMutation from "../hooks/use-thread-mutation";
import CustomAlert from "@/components/alert";
import useThreadStore from "@/features/thread/store";

export default function ThreadDeleteModal() {
  const pathname = usePathname();
  const router = useRouter();
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
          router.push("/");
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
