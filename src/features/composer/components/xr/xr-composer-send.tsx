import { XR_COLORS, XR_STYLES } from "@/styles/xr-styles";
import { Button } from "@react-three/uikit-default";
import { Send } from "@react-three/uikit-lucide";
import useSendMessage from "@/features/composer/hooks/use-send-message";
import useThreadStore from "@/features/thread/store/thread-store";

export default function XRComposerSend() {
  const { sendMessage, blockSend, isLoading } = useSendMessage();

  const setActiveThread = useThreadStore((state) => state.setActiveThread);

  return (
    <Button
      onClick={async () => {
        const threadId = await sendMessage(false);
        if (threadId) {
          setActiveThread(threadId);
        }
      }}
      disabled={blockSend || isLoading}
      size="icon"
      backgroundColor={XR_COLORS.primary}
      width={40}
      height={32}
      borderRadius={XR_STYLES.radiusMd}
    >
      <Send
        width={XR_STYLES.textSm}
        height={XR_STYLES.textSm}
        color={XR_COLORS.primaryForeground}
      />
    </Button>
  );
}
