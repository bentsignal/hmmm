import { useEffect, useRef, useState } from "react";
import { UIMessage } from "ai";
import useMessageStore from "@/features/messages/store";

export default function useThreadScroll({
  messages,
}: {
  messages: UIMessage[];
}) {
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isInitialLoadRef = useRef(true);
  const numMessagesSent = useMessageStore((state) => state.numMessagesSent);
  const [isAtBottom, setIsAtBottom] = useState(true);

  const getScrollElement = () => {
    return scrollAreaRef.current?.querySelector(
      "[data-radix-scroll-area-viewport]",
    );
  };

  const checkIfAtBottom = () => {
    const scrollElement = getScrollElement();
    if (scrollElement) {
      const threshold = 800;
      const isNearBottom =
        scrollElement.scrollTop + scrollElement.clientHeight >=
        scrollElement.scrollHeight - threshold;
      setIsAtBottom(isNearBottom);
    }
  };

  const scrollToBottom = (animate: boolean = false) => {
    const scrollElement = getScrollElement();
    if (scrollElement) {
      scrollElement.scrollTo({
        top: scrollElement.scrollHeight,
        behavior: animate ? "smooth" : "auto",
      });
      setIsAtBottom(true);
    }
  };

  useEffect(() => {
    const scrollElement = getScrollElement();
    if (scrollElement) {
      scrollElement.addEventListener("scroll", checkIfAtBottom);
      return () => scrollElement.removeEventListener("scroll", checkIfAtBottom);
    }
  }, []);

  // scroll to the bottom on page load
  useEffect(() => {
    if (isInitialLoadRef.current && messages.length > 0) {
      scrollToBottom();
      isInitialLoadRef.current = false;
    }
  }, [messages]);

  // when a new message is sent, scroll to the bottom of the page
  useEffect(() => {
    if (numMessagesSent > 0) {
      scrollToBottom(true);
    }
  }, [numMessagesSent]);

  return {
    scrollAreaRef,
    messagesEndRef,
    isAtBottom,
    scrollToBottom,
  };
}
