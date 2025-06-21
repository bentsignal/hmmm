import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";

type Source = {
  id: string;
  sourceType: string;
  url: string;
};

export default function SearchResultMessage({
  text,
  sources,
}: {
  text: string;
  sources: Source[];
}) {
  const [isOpen, setIsOpen] = useState(false);

  // response hasn't landed yet, show loading
  if (text.length === 0)
    return (
      <div className="flex items-center gap-2">
        <span className="mr-1 animate-pulse font-semibold">Searching</span>
      </div>
    );

  // response has landed, show text and  sources
  return (
    <div className="">
      <div
        key={text}
        className="prose dark:prose-invert relative w-full max-w-full"
      >
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{text}</ReactMarkdown>
      </div>
      <div
        className="mt-4 flex cursor-pointer items-center gap-2"
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen && <ChevronDown className="h-4 w-4" />}
        {!isOpen && <ChevronRight className="h-4 w-4" />}
        <span className="mr-1 font-semibold">Sources</span>
      </div>
      {isOpen && (
        <ol className="bg-card mt-2 flex flex-col gap-2 rounded-md p-4">
          {sources.map((source) => (
            <li key={source.url} className="my-1 ml-4 list-decimal text-sm">
              <a
                href={source.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground text-sm break-all"
                style={{ wordBreak: "break-all" }}
              >
                {source.url}
              </a>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
