import { Loader2 } from "lucide-react";
import { useRef, useEffect } from "react";

interface PageLoaderProps {
  status: "LoadingFirstPage" | "CanLoadMore" | "LoadingMore" | "Exhausted";
  loadMore: () => void;
}

export default function PageLoader({ status, loadMore }: PageLoaderProps) {
  const observer = useRef<IntersectionObserver | null>(null);
  const target = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    observer.current = new IntersectionObserver(
      ([entry]) => {
        if (
          entry.isIntersecting &&
          status !== "LoadingFirstPage" &&
          status !== "LoadingMore"
        ) {
          loadMore();
        }
      },
      {
        threshold: 0.1,
      },
    );

    if (target.current) {
      observer.current.observe(target.current);
    }

    return () => {
      if (observer.current && target.current) {
        observer.current.unobserve(target.current);
      }
      observer.current?.disconnect();
    };
  }, [loadMore]);

  if (status === "Exhausted" || status === "LoadingFirstPage") return null;

  return (
    <div ref={target} className="flex w-full items-center justify-center">
      <Loader2 className="h-4 w-4 animate-spin" />
    </div>
  );
}
