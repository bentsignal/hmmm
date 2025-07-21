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

export function Code({ inline, className, children, ...props }: CodeProps) {
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
        <CodeBlock className="">
          <CodeBlockCode
            code={children?.toString() ?? ""}
            theme={theme === "dark" ? "github-dark" : "github-light"}
          />
        </CodeBlock>
      </div>
    );
  }
  return (
    <pre className="not-prose inline-flex">
      <code
        className={`${className || ""} bg-card rounded-md border border-border p-2 my-0.5 font-mono text-sm font-bold whitespace-pre-wrap`}
        {...props}
      >
        {children}
      </code>
    </pre>
  );
}
