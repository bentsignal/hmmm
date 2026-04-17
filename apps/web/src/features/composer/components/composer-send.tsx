import { useEffect, useState } from "react";
import { useConvexAuth } from "convex/react";

import { ComposerSendButton } from "~/features/composer/primitives/composer-send-button";
import { useSendMessage } from "../hooks/use-send-message";

export function ComposerSend({
  showInstantLoad,
  handleError,
}: {
  showInstantLoad?: () => void;
  handleError?: () => void;
}) {
  const { isAuthenticated } = useConvexAuth();
  const { sendMessage, blockSend, isLoading } = useSendMessage();

  // prevent loading state from showing up immediately on page load
  const [optimisticEnable, setOptimisticEnable] = useState(true);
  // eslint-disable-next-line no-restricted-syntax -- Syncs with external timer: delays disabling optimistic state for 3s after mount to prevent loading flash
  useEffect(() => {
    setTimeout(() => {
      setOptimisticEnable(false);
    }, 3000);
  }, []);

  return (
    <ComposerSendButton
      onClick={() => {
        void sendMessage({ showInstantLoad, handleError });
      }}
      disabled={
        isAuthenticated && (blockSend ?? isLoading) && !optimisticEnable
      }
      loading={isLoading && isAuthenticated && !optimisticEnable}
    />
  );
}
