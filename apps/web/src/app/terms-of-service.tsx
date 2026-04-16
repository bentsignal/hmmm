import { createFileRoute } from "@tanstack/react-router";
import { MoveLeft } from "lucide-react";
import ReactMarkdown from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import remarkGfm from "remark-gfm";

import { tos } from "~/app/terms-of-service/-tos";
import { QuickLink } from "~/features/quick-link/quick-link";

export const Route = createFileRoute("/terms-of-service")({
  component: TermsPage,
});

function TermsPage() {
  return (
    <div className="mx-auto flex max-h-screen max-w-[800px] flex-col gap-4 overflow-y-auto px-4 py-8 sm:py-24">
      <QuickLink to="/" className="flex items-center gap-2">
        <MoveLeft className="h-4 w-4" />
        Return to home
      </QuickLink>
      <div className="prose dark:prose-invert relative my-4 w-full max-w-full">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          rehypePlugins={[rehypeHighlight]}
        >
          {tos}
        </ReactMarkdown>
      </div>
    </div>
  );
}
