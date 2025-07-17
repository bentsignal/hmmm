import XRNewThread from "./xr-new-thread";
import XRThread from "./xr-thread";
import useThreadStore from "@/features/thread/store/thread-store";

export default function XRMainThreadViewer() {
  const threadId = useThreadStore((state) => state.activeThread);
  if (!threadId) return <XRNewThread />;
  return <XRThread threadId={threadId} />;
}
