import { ReactNode } from "react";
import { useTheme } from "next-themes";
import { extractTextFromChildren } from "../util/message-util";
import { CopyButton } from "./copy-button";
import { Language } from "./language";
import { CodeBlock, CodeBlockCode } from "@/components/ui/code-block";

interface CodeProps {
  inline?: boolean;
  className?: string;
  children: ReactNode;
}

export function Code({ inline, className, children }: CodeProps) {
  const { theme } = useTheme();
  const isBlock = !inline && (className?.includes("language-") || false);

  if (isBlock) {
    return (
      <div
        className="not-prose group bg-card border-border relative my-2 w-full 
        overflow-hidden rounded-xl border-1"
      >
        <div className="bg-border flex h-14 w-full items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <Language className={className} />
          </div>
          <div className="flex items-center gap-2">
            <CopyButton getContent={() => extractTextFromChildren(children)} />
          </div>
        </div>
        <CodeBlock className="border-none bg-transparent p-6">
          <CodeBlockCode
            code={children?.toString() ?? ""}
            theme={theme === "dark" ? "github-dark" : "github-light"}
          />
        </CodeBlock>
      </div>
    );
  }
  return (
    <div className="not-prose inline-flex max-w-full">
      <CodeBlock className="rounded-md px-2 py-1">
        <CodeBlockCode
          code={children?.toString() ?? ""}
          theme={theme === "dark" ? "github-dark" : "github-light"}
          className="text-sm"
        />
      </CodeBlock>
    </div>
  );
}
