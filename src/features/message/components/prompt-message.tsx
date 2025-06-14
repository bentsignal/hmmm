import { useEffect, useState } from "react";

export default function PromptMessage({ message }: { message: string }) {
  const [opacity, setOpacity] = useState(0);

  useEffect(() => {
    setTimeout(() => setOpacity(1), 100);
  }, []);

  return (
    <div
      className="transition-opacity duration-1000 ease-in-out"
      style={{ opacity }}
    >
      <div
        className="bg-secondary text-secondary-foreground 
        flex max-w-xs flex-col gap-2 rounded-xl px-5 py-4"
      >
        {message}
      </div>
    </div>
  );
}
