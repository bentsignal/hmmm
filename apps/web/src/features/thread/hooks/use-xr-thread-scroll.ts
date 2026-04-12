import type { ContainerRef } from "@react-three/uikit";
import { useEffect, useRef, useState } from "react";

import useMessageStore from "~/features/messages/store";

export default function useXRThreadScroll({
  messagesLoaded,
}: {
  messagesLoaded: boolean;
}) {
  const ref = useRef<ContainerRef>(null);
  const [scrollCount, setScrollCount] = useState(0);
  const numMessagesSent = useMessageStore((state) => state.numMessagesSent);

  const scrollToBottom = () => {
    if (
      ref.current?.scrollPosition &&
      ref.current.maxScrollPosition &&
      ref.current.scrollPosition.value &&
      ref.current.maxScrollPosition.value[1]
    ) {
      ref.current.scrollPosition.value = [
        0,
        ref.current.maxScrollPosition.value[1],
      ];
      setScrollCount((prev) => prev + 1);
    }
  };

  // scroll to the bottom when a new message is sent and when messages initially load
  // eslint-disable-next-line no-restricted-syntax -- Syncs scroll position with message count and initial load state
  useEffect(() => {
    if (numMessagesSent > 0 || messagesLoaded) {
      setTimeout(() => {
        scrollToBottom();
      }, 200);
    }
  }, [numMessagesSent, messagesLoaded]);

  return {
    ref,
    scrollCount,
  };
}
