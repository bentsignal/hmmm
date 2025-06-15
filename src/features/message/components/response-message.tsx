import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import { markdownComponents } from "./markdown-components";
import { useSmoothText } from "@convex-dev/agent/react";

import { CopyButton } from "./copy-button";

export default function ResponseMessage({ message }: { message: string }) {
  const [text] = useSmoothText(message, { charsPerSec: 100000 });

  return (
    <div className="w-full">
      <div className="prose dark:prose-invert relative w-full max-w-full">
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
