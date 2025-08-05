import ReactMarkdown from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import remarkGfm from "remark-gfm";
import { privacyPolicy } from "./privacy-policy";

export default function PrivacyPolicy() {
  return (
    <div className="prose dark:prose-invert relative my-4 w-full max-w-full">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
      >
        {privacyPolicy}
      </ReactMarkdown>
    </div>
  );
}
