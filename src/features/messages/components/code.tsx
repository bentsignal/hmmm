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

export function Code({ children }: CodeProps) {
  const { theme } = useTheme();

  return (
    <div className="not-prose w-full relative my-2 group">
      <div
        className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 
        transition-opacity duration-300"
      >
        <CopyButton getContent={() => extractTextFromChildren(children)} />
      </div>
      <CodeBlock>
        <CodeBlockCode
          code={children?.toString() ?? ""}
          theme={theme === "dark" ? "github-dark" : "github-light"}
        />
      </CodeBlock>
    </div>
  );
}
