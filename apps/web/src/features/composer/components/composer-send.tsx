import { useEffect, useState } from "react";

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

  // prevent loading state from showing up immediately on page load
  const [optimisticEnable, setOptimisticEnable] = useState(true);
  // eslint-disable-next-line no-restricted-syntax -- Syncs with external timer: delays disabling optimistic state for 3s after mount to prevent loading flash
  useEffect(() => {
    setTimeout(() => {
      setOptimisticEnable(false);
    }, 3000);
  }, []);

  const showStop = isGenerating && !optimisticEnable && activeThread !== null;

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
      disabled={(blockSend ?? isLoading) && !optimisticEnable}
    />
  );
}
