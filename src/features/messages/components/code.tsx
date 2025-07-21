import { ReactNode } from "react";
import { useTheme } from "next-themes";
import { extractTextFromChildren } from "../util/message-util";
import { CopyButton } from "./copy-button";
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
      <div className="not-prose w-full relative my-2 group">
        <div
          className="absolute top-4 right-4 z-10 opacity-0 group-hover:opacity-100 
          transition-opacity duration-300"
        >
          <CopyButton getContent={() => extractTextFromChildren(children)} />
        </div>
        <CodeBlock className="p-6">
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
