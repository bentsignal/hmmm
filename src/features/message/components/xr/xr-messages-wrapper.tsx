import { XR_STYLES } from "@/styles/xr-styles";
import XRMessages from "./xr-messages";
import XRNewMessageView from "./xr-new-message-view";
import XRHandle, { CustomContainer, Grabbable } from "@/components/xr";
import useXRMessageListScroll from "@/features/message/hooks/use-xr-message-list-scroll";
import useThreadStore from "@/features/thread/store/thread-store";

export default function XRMessagesWrapper() {
  const threadId = useThreadStore((state) => state.activeThread);
  const { ref } = useXRMessageListScroll({ threadId: threadId || "" });
  return (
    <group position={[0, 0.3, 0]}>
      <Grabbable>
        <CustomContainer
          alignItems="center"
          justifyContent="flex-start"
          gap={XR_STYLES.spacing3xl}
          scrollRef={ref}
        >
          {threadId ? <XRMessages threadId={threadId} /> : <XRNewMessageView />}
        </CustomContainer>
        <XRHandle show={true} />
      </Grabbable>
    </group>
  );
}
