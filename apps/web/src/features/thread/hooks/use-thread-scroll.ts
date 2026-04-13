import { useEffect, useRef, useState } from "react";

import { useMessageStore } from "@acme/features/messages";

function getScrollViewport(scrollArea: HTMLDivElement | null) {
  return scrollArea?.querySelector("[data-radix-scroll-area-viewport]") ?? null;
}

function doScrollToBottom(scrollElement: Element, animate: boolean) {
  scrollElement.scrollTo({
    top: scrollElement.scrollHeight,
    behavior: animate ? "smooth" : "auto",
  });
}

export function useThreadScroll({
  messagesLoaded,
}: {
  messagesLoaded: boolean;
}) {
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isInitialLoadRef = useRef(true);
  const numMessagesSent = useMessageStore((state) => state.numMessagesSent);
  const [isAtBottom, setIsAtBottom] = useState(true);

  function scrollToBottom(animate = false) {
    const scrollElement = getScrollViewport(scrollAreaRef.current);
    if (scrollElement) {
      doScrollToBottom(scrollElement, animate);
      requestAnimationFrame(() => {
        setIsAtBottom(true);
      });
    }
  }

  // eslint-disable-next-line no-restricted-syntax -- Syncs with DOM scroll events on the scroll area viewport
  useEffect(() => {
    const scrollElement = getScrollViewport(scrollAreaRef.current);
    if (!scrollElement) return;
    const element = scrollElement;
    function handleScroll() {
      const threshold = 800;
      const isNearBottom =
        element.scrollTop + element.clientHeight >=
        element.scrollHeight - threshold;
      requestAnimationFrame(() => {
        setIsAtBottom(isNearBottom);
      });
    }
    scrollElement.addEventListener("scroll", handleScroll);
    return () => scrollElement.removeEventListener("scroll", handleScroll);
  }, []);

  // scroll to the bottom on page load
  // eslint-disable-next-line no-restricted-syntax -- Syncs scroll position with initial page load state
  useEffect(() => {
    if (isInitialLoadRef.current && messagesLoaded) {
      const scrollElement = getScrollViewport(scrollAreaRef.current);
      if (scrollElement) {
        doScrollToBottom(scrollElement, false);
        requestAnimationFrame(() => {
          setIsAtBottom(true);
        });
      }
      isInitialLoadRef.current = false;
    }
  }, [messagesLoaded]);

  // when a new message is sent, scroll to the bottom of the page
  // eslint-disable-next-line no-restricted-syntax -- Syncs scroll position when new messages arrive
  useEffect(() => {
    if (numMessagesSent > 0) {
      const scrollElement = getScrollViewport(scrollAreaRef.current);
      if (scrollElement) {
        doScrollToBottom(scrollElement, true);
        requestAnimationFrame(() => {
          setIsAtBottom(true);
        });
      }
    }
  }, [numMessagesSent]);

  return {
    scrollAreaRef,
    messagesEndRef,
    isAtBottom,
    scrollToBottom,
  };
}
