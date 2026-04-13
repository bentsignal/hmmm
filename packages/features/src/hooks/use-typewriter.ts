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

  const snapshot = useRef<Snapshot | null>(null);
  const growthRate = useRef(0);

  // eslint-disable-next-line no-restricted-syntax -- Effect needed to drive typewriter animation via requestAnimationFrame/setTimeout
  useEffect(() => {
    if (!streaming) {
      return;
    }

    snapshot.current = {
      length: inputText.length,
      timestamp: Date.now(),
    };

    const interval = setInterval(() => {
      if (snapshot.current && snapshot.current.length < inputText.length) {
        const delta = Date.now() - snapshot.current.timestamp;
        const growth = inputText.length - snapshot.current.length;
        growthRate.current = (growth / delta) * (1000 / FPS);
        snapshot.current.length = inputText.length;
        snapshot.current.timestamp = Date.now();
      }

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
