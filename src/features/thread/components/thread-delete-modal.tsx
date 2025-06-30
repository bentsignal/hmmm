import CustomAlert from "@/components/alert";
import useThreadMutation from "../hooks/use-thread-mutation";
import { usePathname, useRouter } from "next/navigation";
import useThreadStore from "@/features/thread/store";

export default function ThreadDeleteModal() {
  const pathname = usePathname();
  const router = useRouter();
  const { deleteThread } = useThreadMutation();
  const setSelectedThread = useThreadStore((state) => state.setSelectedThread);
  const deleteModalOpen = useThreadStore((state) => state.deleteModalOpen);
  const setDeleteModalOpen = useThreadStore(
    (state) => state.setDeleteModalOpen,
  );
  return (
    <CustomAlert
      open={deleteModalOpen}
      setOpen={setDeleteModalOpen}
      onCancel={() => {
        setSelectedThread(null);
      }}
      onConfirm={() => {
        const selectedThread = useThreadStore.getState().selectedThread;
        if (!selectedThread) return;
        if (pathname.includes(selectedThread)) {
          router.push("/");
        }
        setTimeout(() => {
          deleteThread({ threadId: selectedThread });
          setSelectedThread(null);
        }, 500);
      }}
      title="Delete Thread"
      message="Are you sure you want to delete this thread?"
      destructive={true}
    />
  );
}
