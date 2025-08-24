import { ImageIcon } from "lucide-react";
import { useConvexAuth, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Doc } from "@/convex/_generated/dataModel";
import { cn } from "@/lib/utils";

export default function MessageImage({
  imageId,
  isActive,
}: {
  imageId: Doc<"generatedImages">["_id"] | null;
  isActive: boolean;
}) {
  const isAuthenticated = useConvexAuth();

  const image = useQuery(
    api.ai.thread.getImageSlot,
    isAuthenticated && imageId
      ? {
          slot: imageId,
        }
      : "skip",
  );

  if (!imageId) return null;

  return (
    <div className="relative flex h-64 w-auto min-w-64">
      {isActive && (
        <div
          className={cn(
            "absolute flex h-64 w-auto min-w-64 items-center justify-center transition-opacity duration-300",
            image ? "pointer-events-none opacity-0" : "opacity-100",
          )}
        >
          <ImageIcon className="relative z-10 h-6 w-6" />
          <div className="bg-card absolute inset-0 z-5 flex h-64 w-auto animate-pulse items-center justify-center rounded-lg" />
        </div>
      )}
      {image && (
        <img
          src={image.url}
          alt="Generated image"
          className="h-64 w-auto rounded-2xl hover:cursor-pointer"
          onClick={() => {
            window.open(image.url, "_blank");
          }}
        />
      )}
    </div>
  );
}
