"use client";

import ReactMarkdown from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import remarkGfm from "remark-gfm";
import { markdownComponents } from "@/features/messages/components/markdown-components";

export default function SettingsBangs() {
  const bang = "```bash\nhttps://www.qbe.sh/new?q=%s\n```";
  return (
    <div className="flex flex-col">
      <span className="text-md font-bold mb-2">Search</span>
      <span className="text-sm text-muted-foreground">
        Add the following URL to your browser&apos;s search engine settings to
        create new chats directly from your browser&apos;s search bar.
      </span>
      <div className="prose dark:prose-invert relative w-full max-w-full">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          rehypePlugins={[rehypeHighlight]}
          components={markdownComponents}
        >
          {bang}
        </ReactMarkdown>
      </div>
    </div>
  );
}
