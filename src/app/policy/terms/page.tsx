import ReactMarkdown from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import remarkGfm from "remark-gfm";
import { tos } from "./tos";

export default function Terms() {
  return (
    <div className="prose dark:prose-invert relative my-4 w-full max-w-full">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
      >
        {tos}
      </ReactMarkdown>
    </div>
  );
}
