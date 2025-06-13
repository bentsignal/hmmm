import { useEffect, useRef, useState } from "react";

export default function useMessageListScroll(uiMessagesLength: number) {
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isInitialLoadRef = useRef(true);
  const previousMessageCountRef = useRef(0);
  const [isAtBottom, setIsAtBottom] = useState(true);

  const checkIfAtBottom = () => {
    const scrollElement = scrollAreaRef.current?.querySelector(
      "[data-radix-scroll-area-viewport]",
    );
    if (scrollElement) {
      const threshold = 100;
      const isNearBottom =
        scrollElement.scrollTop + scrollElement.clientHeight >=
        scrollElement.scrollHeight - threshold;
      setIsAtBottom(isNearBottom);
    }
  };

  const scrollToBottom = () => {
    const scrollElement = scrollAreaRef.current?.querySelector(
      "[data-radix-scroll-area-viewport]",
    );
    if (scrollElement) {
      scrollElement.scrollTo({
        top: scrollElement.scrollHeight,
        behavior: "auto",
      });
      setIsAtBottom(true);
    }
  };

  useEffect(() => {
    const scrollElement = scrollAreaRef.current?.querySelector(
      "[data-radix-scroll-area-viewport]",
    );

    if (scrollElement) {
      scrollElement.addEventListener("scroll", checkIfAtBottom);
      return () => scrollElement.removeEventListener("scroll", checkIfAtBottom);
    }
  }, []);

  useEffect(() => {
    const scrollElement = scrollAreaRef.current?.querySelector(
      "[data-radix-scroll-area-viewport]",
    );

    if (scrollElement && uiMessagesLength > 0) {
      if (isInitialLoadRef.current) {
        scrollElement.scrollTo({
          top: scrollElement.scrollHeight,
          behavior: "auto",
        });
        isInitialLoadRef.current = false;
        previousMessageCountRef.current = uiMessagesLength;
        setIsAtBottom(true);
      } else if (uiMessagesLength > previousMessageCountRef.current) {
        const lastMessage = messagesEndRef.current?.previousElementSibling;
        if (lastMessage) {
          const scrollTop =
            lastMessage.getBoundingClientRect().top -
            scrollElement.getBoundingClientRect().top +
            scrollElement.scrollTop;
          scrollElement.scrollTo({
            top: scrollTop,
            behavior: "smooth",
          });
        }
        previousMessageCountRef.current = uiMessagesLength;
        checkIfAtBottom();
      }
    }
  }, [uiMessagesLength]);

  return {
    scrollAreaRef,
    messagesEndRef,
    isAtBottom,
    scrollToBottom,
  };
}
