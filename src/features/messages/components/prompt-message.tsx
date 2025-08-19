import { useState } from "react";
import { UIMessage } from "@convex-dev/agent/react";
import { CopyButton } from "./copy-button";
import { Markdown } from "@/components/ui/markdown";

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
        flex max-w-lg flex-col gap-2 overflow-hidden rounded-xl px-5
        py-4 shadow-md"
      >
        <Markdown className="prose dark:prose-invert relative w-full max-w-full">
          {message.text}
        </Markdown>
      </div>
      <div
        className="absolute right-0 -bottom-10 mt-2 flex justify-end transition-opacity duration-300 ease-in-out"
        style={{ opacity: hovering ? 1 : 0 }}
      >
        <CopyButton getContent={() => message.text} />
      </div>
    </div>
  );
}
