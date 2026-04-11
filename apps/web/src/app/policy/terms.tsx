import { createFileRoute } from "@tanstack/react-router";
import ReactMarkdown from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import remarkGfm from "remark-gfm";

import { tos } from "~/app/policy/terms/-tos";

export const Route = createFileRoute("/policy/terms")({
  component: TermsPage,
});

function TermsPage() {
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
