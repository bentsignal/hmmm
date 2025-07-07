import ReactMarkdown from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import remarkGfm from "remark-gfm";
import { privacyPolicy } from "./privacy-policy";

export default function PrivacyPolicy() {
  return (
    <div className="prose dark:prose-invert relative w-full max-w-full my-4">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
      >
        {privacyPolicy}
      </ReactMarkdown>
    </div>
  );
}
