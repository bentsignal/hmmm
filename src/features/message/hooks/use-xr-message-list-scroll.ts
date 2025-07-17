import { useEffect, useRef, useState } from "react";
import { ContainerRef } from "@react-three/uikit";

export default function useXRMessageListScroll({
  threadId,
}: {
  threadId: string;
}) {
  const ref = useRef<ContainerRef>(null);
  const [scrollCount, setScrollCount] = useState(0);

  useEffect(() => {
    setTimeout(() => {
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
    }, 200);
  }, [threadId]);

  return {
    ref,
    scrollCount,
  };
}
