import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import { markdownComponents } from "./markdown-components";
import { useSmoothText } from "@convex-dev/agent/react";
import { useEffect, useState } from "react";
import { CopyButton } from "./copy-button";

export default function ResponseMessage({ message }: { message: string }) {
  const [text] = useSmoothText(message, { charsPerSec: 100000 });
  const [opacity, setOpacity] = useState(0);

  useEffect(() => {
    setOpacity(1);
  }, []);

  return (
    <div
      className="w-full transition-opacity duration-1000 ease-in-out"
      style={{ opacity }}
    >
      <div className="relative w-full">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          rehypePlugins={[rehypeHighlight]}
          components={markdownComponents}
        >
          {text}
        </ReactMarkdown>
        <div className="mt-2 flex justify-start">
          <CopyButton text={text} />
        </div>
      </div>
    </div>
  );
}
