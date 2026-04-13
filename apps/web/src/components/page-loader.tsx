import { useEffect, useRef, useState } from "react";

interface PageLoaderProps {
  status: "LoadingFirstPage" | "CanLoadMore" | "LoadingMore" | "Exhausted";
  loadMore: () => void;
  children: React.ReactNode;
  singleUse?: boolean;
}

export function PageLoader({
  status,
  loadMore,
  children,
  singleUse = false,
}: PageLoaderProps) {
  const observer = useRef<IntersectionObserver | null>(null);
  const target = useRef<HTMLDivElement | null>(null);
  const [used, setUsed] = useState(false);

  // eslint-disable-next-line no-restricted-syntax -- Syncing with IntersectionObserver DOM API to detect when the sentinel element enters the viewport
  useEffect(() => {
    observer.current = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting && status === "CanLoadMore") {
          if (!singleUse || !used) {
            loadMore();
            if (singleUse) {
              setUsed(true);
            }
          }
        }
      },
      {
        threshold: 0.1,
      },
    );

    const currentTarget = target.current;
    if (currentTarget) {
      observer.current.observe(currentTarget);
    }

    return () => {
      if (observer.current && currentTarget) {
        observer.current.unobserve(currentTarget);
      }
      observer.current?.disconnect();
    };
  }, [loadMore, status, singleUse, used]);

  return (
    <div ref={target} className="flex w-full items-center justify-center">
      {children}
    </div>
  );
}
