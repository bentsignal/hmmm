import XRMessageList from "./xr-message-list";
import useThreadStore from "@/features/thread/store/thread-store";

export default function XRMessageListWrapper() {
  const threadId = useThreadStore((state) => state.activeThread);
  if (!threadId) return null;
  return <XRMessageList threadId={threadId} />;
}
