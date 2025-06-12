import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import { markdownComponents } from "./markdown-components";

export default function ResponseMessage({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-start gap-2">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
        components={markdownComponents}
      >
        {message}
      </ReactMarkdown>
    </div>
  );
}
