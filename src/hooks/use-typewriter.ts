import { useEffect, useState } from "react";

export function useTypewriter({
  text,
  streaming,
}: {
  text: string;
  streaming: boolean;
}) {
  const [visibleText, setVisibleText] = useState("");

  useEffect(() => {
    if (!streaming) {
      return;
    }

    const interval = setInterval(() => {
      setVisibleText((current) => {
        if (current.length < text.length) {
          const nextIndex = Math.min(current.length + 5, text.length);
          return text.slice(0, nextIndex);
        }
        return text;
      });
    }, 10);

    return () => clearInterval(interval);
  }, [streaming, text]);

  if (!streaming) {
    return { text };
  }
  return { text: visibleText };
}
