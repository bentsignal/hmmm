import { ImageIcon } from "lucide-react";
import { useConvexAuth, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Doc } from "@/convex/_generated/dataModel";

export default function MessageImage({
  imageId,
}: {
  imageId: Doc<"generatedImages">["_id"] | null;
}) {
  if (!imageId) {
    return null;
  }
  return <ImageViewer imageId={imageId} />;
}

const ImageViewer = ({
  imageId,
}: {
  imageId: Doc<"generatedImages">["_id"];
}) => {
  const isAuthenticated = useConvexAuth();
  const image = useQuery(
    api.ai.thread.getImageSlot,
    isAuthenticated
      ? {
          slot: imageId,
        }
      : "skip",
  );
  if (!image) {
    return (
      <div className="relative flex h-64 w-auto min-w-64 items-center justify-center">
        <ImageIcon className="relative z-10 h-6 w-6" />
        <div className="bg-card absolute inset-0 z-5 flex h-64 w-auto animate-pulse items-center justify-center rounded-lg" />
      </div>
    );
  }
  return (
    <img
      src={image.url}
      alt="Generated image"
      className="h-64 w-auto rounded-2xl hover:cursor-pointer"
      onClick={() => {
        window.open(image.url, "_blank");
      }}
    />
  );
};
