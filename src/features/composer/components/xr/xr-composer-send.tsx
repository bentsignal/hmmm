import { xrColors, xrStyles } from "@/styles/xr-styles";
import { Button } from "@react-three/uikit-default";
import { Send } from "@react-three/uikit-lucide";
import useSendMessage from "@/features/composer/hooks/use-send-message";
import useComposerStore from "@/features/composer/store/composer-store";
import useThreadStore from "@/features/thread/store/thread-store";

export default function XRComposerSend() {
  const { sendMessage, blockSend, isLoading } = useSendMessage();

  const setActiveThread = useThreadStore((state) => state.setActiveThread);

  return (
    <Button
      onClick={async () => {
        const prompt = useComposerStore.getState().prompt;
        const threadId = await sendMessage({ prompt, redirect: false });
        if (threadId) {
          setActiveThread(threadId);
        }
      }}
      disabled={blockSend || isLoading}
      size="icon"
      backgroundColor={xrColors.primary}
      width={40}
      height={32}
      borderRadius={xrStyles.radiusMd}
    >
      <Send
        width={xrStyles.textSm}
        height={xrStyles.textSm}
        color={xrColors.primaryForeground}
      />
    </Button>
  );
}
