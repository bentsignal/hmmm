import { useEffect, useState } from "react";
import { CopyButton } from "./copy-button";

export default function PromptMessage({ message }: { message: string }) {
  const [opacity, setOpacity] = useState(0);
  const [hovering, setHovering] = useState(false);

  useEffect(() => {
    setTimeout(() => setOpacity(1), 100);
  }, []);

  return (
    <div
      className="relative transition-opacity duration-1000 ease-in-out"
      style={{ opacity }}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
    >
      <div
        className="bg-secondary text-secondary-foreground 
        flex max-w-xs flex-col gap-2 rounded-xl px-5 py-4
        shadow-md"
      >
        <div>{message}</div>
      </div>
      <div
        className="absolute right-0 -bottom-10 mt-2 flex justify-end transition-opacity duration-300 ease-in-out"
        style={{ opacity: hovering ? 1 : 0 }}
      >
        <CopyButton text={message} />
      </div>
    </div>
  );
}
