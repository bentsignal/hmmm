import CustomAlert from "@/components/alert";
import useThreadMutation from "../hooks/use-thread-mutation";
import { usePathname, useRouter } from "next/navigation";

interface ThreadDeleteModalProps {
  selectedThread: string | null;
  setSelectedThread: (thread: string | null) => void;
  open: boolean;
  setOpen: (open: boolean) => void;
}

export default function ThreadDeleteModal({
  selectedThread,
  setSelectedThread,
  open,
  setOpen,
}: ThreadDeleteModalProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { deleteThread } = useThreadMutation();
  return (
    <CustomAlert
      open={open}
      setOpen={setOpen}
      onCancel={() => {
        setSelectedThread(null);
      }}
      onConfirm={() => {
        if (selectedThread) {
          if (pathname.includes(selectedThread)) {
            router.push("/");
          }
          deleteThread({ threadId: selectedThread });
          setSelectedThread(null);
        }
      }}
      title="Delete Thread"
      message="Are you sure you want to delete this thread?"
      destructive={true}
    />
  );
}
