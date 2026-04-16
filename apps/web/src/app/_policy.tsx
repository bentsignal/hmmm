import { createFileRoute, useChildMatches } from "@tanstack/react-router";
import { MoveLeft } from "lucide-react";
import ReactMarkdown from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import remarkGfm from "remark-gfm";

import { QuickLink } from "~/features/quick-link/quick-link";

export const Route = createFileRoute("/_policy")({
  component: PolicyLayout,
  headers: () => ({
    "Cache-Control":
      "public, max-age=0, s-maxage=31536000, stale-while-revalidate=86400",
  }),
});

function PolicyLayout() {
  const content = useChildMatches({
    select: (matches) => matches.at(-1)?.loaderData ?? "",
  });

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
          {content}
        </ReactMarkdown>
      </div>
    </div>
  );
}
