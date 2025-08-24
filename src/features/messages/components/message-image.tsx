import { ImageIcon } from "lucide-react";
import { useConvexAuth, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

export default function MessageImage({ image }: { image?: string | null }) {
  if (!image) return null;

  if (image === "in-progress") {
    return <InProgress />;
  }

  return <Generated fileKey={image} />;
}

const Generated = ({ fileKey }: { fileKey: string }) => {
  const isAuthenticated = useConvexAuth();

  const image = useQuery(
    api.app.library.getFileByKey,
    isAuthenticated
      ? {
          key: fileKey,
        }
      : "skip",
  );

  console.log(image);

  if (!image) return null;

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

const InProgress = () => {
  return (
    <div className="relative flex h-64 w-auto min-w-64 items-center justify-center opacity-100 transition-opacity duration-300">
      <ImageIcon className="relative z-10 h-6 w-6" />
      <div className="bg-card absolute inset-0 z-5 flex h-64 w-auto animate-pulse items-center justify-center rounded-lg" />
    </div>
  );
};
