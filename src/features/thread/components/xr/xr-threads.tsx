import useThreadStore from "../../store";
import XRThread from "./xr-thread";

export default function XRThreads() {
  const xrThreads = useThreadStore((state) => state.xrThreads);
  return xrThreads.map((thread) => (
    <XRThread key={thread.id} threadId={thread.id} offset={0.1} />
  ));
}
