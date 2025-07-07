import ReactMarkdown from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import remarkGfm from "remark-gfm";
import { tos } from "./tos";

export default function Terms() {
  return (
    <div className="prose dark:prose-invert relative w-full max-w-full my-4">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
      >
        {tos}
      </ReactMarkdown>
    </div>
  );
}
