import { useEffect, useRef, useState } from "react";

const FPS = 100;

interface Snapshot {
  length: number;
  timestamp: number;
}

export function useTypewriter({
  inputText,
  streaming,
}: {
  inputText: string;
  streaming: boolean;
}) {
  const [visibleText, setVisibleText] = useState("");

  const snapshot = useRef<Snapshot>({
    length: inputText.length,
    timestamp: Date.now(),
  });
  const growthRate = useRef(0);

  useEffect(() => {
    if (!streaming) {
      return;
    }

    const interval = setInterval(() => {
      // determine how fast the length of the input text is growing
      if (snapshot.current.length < inputText.length) {
        const delta = Date.now() - snapshot.current.timestamp;
        const growth = inputText.length - snapshot.current.length;
        growthRate.current = (growth / delta) * (1000 / FPS);
        snapshot.current.length = inputText.length;
        snapshot.current.timestamp = Date.now();
      }

      // dynamically update the visible text based on the growth rate of the input text
      setVisibleText((current) => {
        if (current.length < inputText.length) {
          const nextIndex = Math.min(
            current.length + growthRate.current,
            inputText.length,
          );
          return inputText.slice(0, nextIndex);
        }
        return inputText;
      });
    }, 1000 / FPS);

    return () => clearInterval(interval);
  }, [streaming, inputText]);

  if (!streaming) {
    return { animatedText: inputText };
  }

  return { animatedText: visibleText };
}
