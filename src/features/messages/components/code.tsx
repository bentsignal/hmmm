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
  console.log(className);

  if (isBlock) {
    return (
      <div
        className="not-prose w-full relative my-2 group bg-card border-border 
        border-1 rounded-xl overflow-hidden"
      >
        <div className="bg-border w-full h-14 flex items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <Language className={className} />
          </div>
          <div className="flex items-center gap-2">
            <CopyButton getContent={() => extractTextFromChildren(children)} />
          </div>
        </div>
        <CodeBlock className="p-6 bg-transparent border-none">
          <CodeBlockCode
            code={children?.toString() ?? ""}
            theme={theme === "dark" ? "github-dark" : "github-light"}
          />
        </CodeBlock>
      </div>
    );
  }
  return (
    <div className="not-prose inline-flex">
      <CodeBlock className="px-2 py-1 rounded-md">
        <CodeBlockCode
          code={children?.toString() ?? ""}
          theme={theme === "dark" ? "github-dark" : "github-light"}
          className="text-sm"
        />
      </CodeBlock>
    </div>
  );
}
