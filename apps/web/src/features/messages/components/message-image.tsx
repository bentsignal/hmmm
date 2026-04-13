import { useConvexAuth, useQuery } from "convex/react";
import { ImageIcon } from "lucide-react";

import { api } from "@acme/db/api";

import { Image } from "~/components/image";
import { useFileInteraction } from "~/features/library/hooks/use-file-interaction";

export function MessageImage({ image }: { image?: string | null }) {
  if (!image) return null;

  if (image === "in-progress") {
    return <InProgress />;
  }

  return <Generated fileKey={image} />;
}

function Generated({ fileKey }: { fileKey: string }) {
  const { handleFileClick, handleFileHover } = useFileInteraction();
  const { isAuthenticated } = useConvexAuth();

  // eslint-disable-next-line no-restricted-syntax -- convex useQuery doesn't support select; conditional fetch via "skip"
  const image = useQuery(
    api.app.library.getFileByKey,
    isAuthenticated
      ? {
          key: fileKey,
        }
      : "skip",
  );

  if (!image) return null;

  return (
    <Image
      src={image.url}
      alt="Generated image"
      width={256}
      height={256}
      className="h-64 w-auto rounded-2xl hover:cursor-pointer"
      onMouseEnter={() => {
        handleFileHover(image, "default");
      }}
      onClick={() => {
        handleFileClick(image, "default", false);
      }}
    />
  );
}

function InProgress() {
  return (
    <div className="relative flex h-64 w-auto min-w-64 items-center justify-center opacity-100 transition-opacity duration-300">
      <ImageIcon className="relative z-10 h-6 w-6" />
      <div className="bg-card absolute inset-0 z-5 flex h-64 w-auto animate-pulse items-center justify-center rounded-lg" />
    </div>
  );
}
