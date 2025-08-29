"use client";

import { env } from "@/env";
import { Markdown } from "@/components/ui/markdown";
import { CopyButton } from "@/features/messages/components/copy-button";

export default function SettingsBangs() {
  console.log(env.NEXT_PUBLIC_BASE_URL);
  const bangURL = `${env.NEXT_PUBLIC_BASE_URL}/new?q=%s`;
  const bang = `\`\n${bangURL}\n\`\n`;
  return (
    <>
      <span>
        Add the following URL to your browser&apos;s search engine settings to
        create new chats directly from your browser&apos;s search bar.
      </span>
      <div
        className="prose dark:prose-invert relative flex w-full 
        max-w-full flex-row items-center justify-start gap-2"
      >
        <Markdown className="prose dark:prose-invert">{bang}</Markdown>
        <CopyButton getContent={() => bangURL} />
      </div>
    </>
  );
}
