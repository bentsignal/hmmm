"use client";

import { Markdown } from "@/components/ui/markdown";
import { CopyButton } from "@/features/messages/components/copy-button";

export default function SettingsBangs() {
  const bangURL = "https://www.qbe.sh/new?q=%s";
  const bang = `\`\n${bangURL}\n\`\n`;
  return (
    <>
      <span className="text-sm text-muted-foreground">
        Add the following URL to your browser&apos;s search engine settings to
        create new chats directly from your browser&apos;s search bar.
      </span>
      <div
        className="prose dark:prose-invert relative w-full max-w-full 
        flex flex-row items-center justify-start gap-2"
      >
        <Markdown className="prose dark:prose-invert">{bang}</Markdown>
        <CopyButton getContent={() => bangURL} />
      </div>
    </>
  );
}
