import { createFileRoute } from "@tanstack/react-router";
import ReactMarkdown from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import remarkGfm from "remark-gfm";

import { privacyPolicy } from "~/app/policy/privacy/-privacy-policy";

export const Route = createFileRoute("/policy/privacy")({
  component: PrivacyPage,
});

function PrivacyPage() {
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
