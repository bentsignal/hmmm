import { ReactNode } from "react";

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
        <pre {...props} className="bg-card my-2 w-full rounded-xl border p-4">
          <code className="break-words whitespace-pre-wrap">{children}</code>
        </pre>
      </div>
    );
  } else {
    return (
      <code
        className={`${className || ""} bg-secondary rounded-md px-1 py-0.5 text-sm`}
        {...props}
      >
        {children}
      </code>
    );
  }
}
