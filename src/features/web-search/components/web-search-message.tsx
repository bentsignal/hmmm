// import { useState } from "react";
import { Globe } from "lucide-react";

interface Source {
  content: string;
  title: string;
  url: string;
  favicon: string;
  image: string;
}

export default function WebSearchMessage({ sources }: { sources: Source[] }) {
  // const [isOpen, setIsOpen] = useState(false);

  // response hasn't landed yet, show loading
  if (sources.length === 0)
    return (
      <div className="flex items-center gap-2">
        <span className="mr-1 flex animate-pulse items-center gap-2 font-semibold">
          <Globe className="h-4 w-4" />
          Searching
        </span>
      </div>
    );

  // return sources.map((source) => (
  //   <div key={source.url}>
  //     <h3>{source.title}</h3>
  //     <p>{source.content}</p>
  //   </div>
  // ));

  // response has landed, show sources
  // return (
  //   <div className="">
  //     <div
  //       className="mt-4 flex cursor-pointer items-center gap-2"
  //       onClick={() => setIsOpen(!isOpen)}
  //     >
  //       {isOpen && <ChevronDown className="h-4 w-4" />}
  //       {!isOpen && <ChevronRight className="h-4 w-4" />}
  //       <span className="mr-1 font-semibold">Sources</span>
  //     </div>
  //     {isOpen && (
  //       <ol className="bg-card mt-2 flex flex-col gap-2 rounded-md p-4">
  //         {sources.map((source) => (
  //           <li key={source.url} className="my-1 ml-4 list-decimal text-sm">
  //             <a
  //               href={source.url}
  //               target="_blank"
  //               rel="noopener noreferrer"
  //               className="text-muted-foreground text-sm break-all"
  //               style={{ wordBreak: "break-all" }}
  //             >
  //               {source.title}
  //             </a>
  //           </li>
  //         ))}
  //       </ol>
  //     )}
  //   </div>
  // );
}
