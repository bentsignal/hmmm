import { useThreadMutation, useThreadStore } from "@acme/features/thread";

import { ComposerSendButton } from "~/features/composer/primitives/composer-send-button";
import { useSendMessage } from "../hooks/use-send-message";

export function ComposerSend({
  showInstantLoad,
  handleError,
}: {
  showInstantLoad?: () => void;
  handleError?: () => void;
}) {
  const { sendMessage, blockSend, isLoading, isGenerating } = useSendMessage();
  const { abortGeneration } = useThreadMutation();
  const activeThread = useThreadStore((state) => state.activeThread);

  const showStop = isGenerating && activeThread !== null;

  if (showStop) {
    return (
      <ComposerSendButton
        mode="stop"
        onClick={() => {
          if (activeThread) abortGeneration({ threadId: activeThread });
        }}
      />
    );
  }

  return (
    <ComposerSendButton
      onClick={() => {
        void sendMessage({ showInstantLoad, handleError });
      }}
      disabled={blockSend ?? isLoading}
    />
  );
}
