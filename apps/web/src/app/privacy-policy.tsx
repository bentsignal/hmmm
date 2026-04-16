import { createFileRoute } from "@tanstack/react-router";
import { MoveLeft } from "lucide-react";
import ReactMarkdown from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import remarkGfm from "remark-gfm";

import { privacyPolicy } from "~/app/privacy-policy/-privacy-policy";
import { QuickLink } from "~/features/quick-link/quick-link";

export const Route = createFileRoute("/privacy-policy")({
  component: PrivacyPage,
});

function PrivacyPage() {
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
          {privacyPolicy}
        </ReactMarkdown>
      </div>
    </div>
  );
}
