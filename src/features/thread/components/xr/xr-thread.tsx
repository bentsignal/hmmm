import { XR_STYLES } from "@/styles/xr-styles";
import { CustomContainer, Grabbable, XRHandle } from "@/components/xr";
import { Messages } from "@/features/message/components/xr";
import useXRMessageListScroll from "@/features/message/hooks/use-xr-message-list-scroll";

export default function XRThread({ threadId }: { threadId: string }) {
  const { ref } = useXRMessageListScroll({ threadId });
  return (
    <group position={[0, 0.3, 0]}>
      <Grabbable>
        <CustomContainer
          alignItems="center"
          justifyContent="flex-start"
          gap={XR_STYLES.spacing3xl}
          scrollRef={ref}
        >
          <Messages threadId={threadId} />
        </CustomContainer>
        <XRHandle show={true} />
      </Grabbable>
    </group>
  );
}
