import { useEffect, useRef, useState } from "react";
import { ContainerRef } from "@react-three/uikit";
import useMessageStore from "@/features/messages/store";

export default function useXRThreadScroll({
  messagesLoaded,
}: {
  messagesLoaded: boolean;
}) {
  const ref = useRef<ContainerRef>(null);
  const [scrollCount, setScrollCount] = useState(0);
  const numMessagesSent = useMessageStore((state) => state.numMessagesSent);

  // scroll to the bottom when a new message is sent and when messages initially load
  useEffect(() => {
    if (numMessagesSent > 0 || messagesLoaded) {
      setTimeout(() => {
        scrollToBottom();
      }, 200);
    }
  }, [numMessagesSent, messagesLoaded]);

  const scrollToBottom = () => {
    if (
      ref.current &&
      ref.current.scrollPosition &&
      ref.current.maxScrollPosition &&
      ref.current.scrollPosition.value &&
      ref.current.maxScrollPosition.value[1]
    ) {
      ref.current.scrollPosition.value = [
        0,
        ref.current.maxScrollPosition.value[1],
      ];
      setScrollCount(scrollCount + 1);
    }
  };

  return {
    ref,
    scrollCount,
  };
}
