import { memo, useState } from "react";
import { UIMessage } from "@convex-dev/agent/react";
import { CopyButton } from "./copy-button";

export default function PromptMessage({ message }: { message: UIMessage }) {
  const [hovering, setHovering] = useState(false);

  return (
    <div
      className="relative flex items-center justify-end"
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
    >
      <div
        className="bg-secondary text-secondary-foreground 
        flex max-w-md flex-col gap-2 overflow-hidden rounded-xl px-5
        py-4 shadow-md"
      >
        <div>{message.content}</div>
      </div>
      <div
        className="absolute right-0 -bottom-10 mt-2 flex justify-end transition-opacity duration-300 ease-in-out"
        style={{ opacity: hovering ? 1 : 0 }}
      >
        <CopyButton getContent={() => message.content} />
      </div>
    </div>
  );
}

export const MemoizedPrompt = memo(PromptMessage);
