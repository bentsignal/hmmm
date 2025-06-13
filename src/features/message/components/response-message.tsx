import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import { markdownComponents } from "./markdown-components";
import { useSmoothText } from "@convex-dev/agent/react";
import { useEffect, useState } from "react";

export default function ResponseMessage({ message }: { message: string }) {
  const [text] = useSmoothText(message, { charsPerSec: 100000 });
  const [opacity, setOpacity] = useState(0);

  useEffect(() => {
    setOpacity(1);
  }, []);

  return (
    <div
      className="transition-opacity duration-1000 ease-in-out"
      style={{ opacity }}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
        components={markdownComponents}
      >
        {text}
      </ReactMarkdown>
    </div>
  );
}
