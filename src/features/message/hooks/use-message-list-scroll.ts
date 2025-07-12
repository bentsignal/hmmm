import { useEffect, useRef, useState } from "react";
import useMessages from "./use-messages";

export default function useMessageListScroll({
  threadId,
}: {
  threadId: string;
}) {
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isInitialLoadRef = useRef(true);
  const previousMessageCountRef = useRef(0);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const { messages } = useMessages({ threadId });

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

    if (scrollElement && messages.length > 0) {
      if (isInitialLoadRef.current) {
        scrollElement.scrollTo({
          top: scrollElement.scrollHeight,
          behavior: "auto",
        });
        isInitialLoadRef.current = false;
        previousMessageCountRef.current = messages.length;
        setIsAtBottom(true);
      } else if (
        messages.length > previousMessageCountRef.current &&
        messages[messages.length - 1].role === "user"
      ) {
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
        previousMessageCountRef.current = messages.length;
        checkIfAtBottom();
      }
    }
  }, [messages.length]);

  return {
    scrollAreaRef,
    messagesEndRef,
    isAtBottom,
    scrollToBottom,
  };
}
