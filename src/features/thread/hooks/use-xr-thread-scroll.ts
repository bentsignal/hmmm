import { useEffect, useRef, useState } from "react";
import { ContainerRef } from "@react-three/uikit";
import useMessageStore from "@/features/message/store";

export default function useXRThreadScroll({ threadId }: { threadId: string }) {
  const ref = useRef<ContainerRef>(null);
  const [scrollCount, setScrollCount] = useState(0);
  const numMessagesSent = useMessageStore((state) => state.numMessagesSent);

  // scroll to the bottom when opening a new thread
  useEffect(() => {
    setTimeout(() => {
      scrollToBottom();
    }, 200);
  }, [threadId]);

  // scroll to the bottom when a new message is sent
  useEffect(() => {
    if (numMessagesSent > 0) {
      setTimeout(() => {
        scrollToBottom();
      }, 200);
    }
  }, [numMessagesSent]);

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
