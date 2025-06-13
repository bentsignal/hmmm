import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import { markdownComponents } from "./markdown-components";
import { useSmoothText } from "@convex-dev/agent/react";

export default function ResponseMessage({ message }: { message: string }) {
  const [text] = useSmoothText(message, { charsPerSec: 100000 });
  return (
    <div className="flex flex-col items-start gap-2">
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
