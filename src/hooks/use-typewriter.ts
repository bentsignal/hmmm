import { useEffect, useState } from "react";

const FPS = 100;
const increment = 5;

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
          const nextIndex = Math.min(current.length + increment, text.length);
          return text.slice(0, nextIndex);
        }
        return text;
      });
    }, 1000 / FPS);

    return () => clearInterval(interval);
  }, [streaming, text]);

  if (!streaming) {
    return { text };
  }
  return { text: visibleText };
}
