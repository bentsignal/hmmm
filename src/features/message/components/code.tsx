import { ReactNode } from "react";
import { CopyButton } from "./copy-button";
import { extractTextFromChildren } from "../util/message-util";

interface CodeProps {
  inline?: boolean;
  className?: string;
  children: ReactNode;
}

export function Code({ inline, className, children, ...props }: CodeProps) {
  const isBlock = !inline && (className?.includes("language-") || false);

  if (isBlock) {
    return (
      <div className="not-prose w-full">
        <div className="bg-card relative my-4 w-full rounded-xl border px-2">
          <div className="absolute top-2 right-2 z-10">
            <CopyButton getContent={() => extractTextFromChildren(children)} />
          </div>
          <pre {...props} className="p-4 pr-12">
            <code className="font-mono text-xs break-words whitespace-pre-wrap md:text-sm">
              {children}
            </code>
          </pre>
        </div>
      </div>
    );
  } else {
    return (
      <code
        className={`${className || ""} bg-secondary rounded-md px-1 py-0.5 font-mono text-sm`}
        {...props}
      >
        {children}
      </code>
    );
  }
}
