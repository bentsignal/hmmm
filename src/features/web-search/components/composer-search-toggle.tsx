// import { Button } from "@/components/ui/button";
// import { cn } from "@/lib/utils";
// import {
//   Tooltip,
//   TooltipContent,
//   TooltipTrigger,
// } from "@/components/ui/tooltip";
// import { Globe } from "lucide-react";
// import useComposerStore from "../../composer/store";

// export default function ComposerSearchToggle() {
//   const useSearch = useComposerStore((state) => state.useSearch);
//   const setUseSearch = useComposerStore((state) => state.setUseSearch);

//   return (
//     <Tooltip>
//       <TooltipTrigger asChild>
//         <Button
//           variant="outline"
//           size="icon"
//           onClick={() => setUseSearch(!useSearch)}
//         >
//           <Globe className={cn("h-4 w-4", useSearch && "text-blue-300")} />
//         </Button>
//       </TooltipTrigger>
//       <TooltipContent>
//         <p>Search the web</p>
//       </TooltipContent>
//     </Tooltip>
//   );
// }
