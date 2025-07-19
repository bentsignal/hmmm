import XRNewThread from "./xr-new-thread";
import XRThread from "./xr-thread";
import useThreadStore from "@/features/thread/store/thread-store";

export default function XRMainThreadViewer() {
  const mainThread = useThreadStore((state) => state.mainThread);
  if (!mainThread) return <XRNewThread />;
  return <XRThread threadId={mainThread.id} isMainThread={true} />;
}
