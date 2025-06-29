import { useRef, useEffect } from "react";

interface PageLoaderProps {
  status: "LoadingFirstPage" | "CanLoadMore" | "LoadingMore" | "Exhausted";
  loadMore: () => void;
  children: React.ReactNode;
}

export default function PageLoader({
  status,
  loadMore,
  children,
}: PageLoaderProps) {
  const observer = useRef<IntersectionObserver | null>(null);
  const target = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    observer.current = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && status === "CanLoadMore") {
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
      {children}
    </div>
  );
}
