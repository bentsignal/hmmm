import { useRef, useEffect, useState } from "react";

interface PageLoaderProps {
  status: "LoadingFirstPage" | "CanLoadMore" | "LoadingMore" | "Exhausted";
  loadMore: () => void;
  children: React.ReactNode;
  singleUse?: boolean;
}

export default function PageLoader({
  status,
  loadMore,
  children,
  singleUse = false,
}: PageLoaderProps) {
  const observer = useRef<IntersectionObserver | null>(null);
  const target = useRef<HTMLDivElement | null>(null);
  const [used, setUsed] = useState(false);

  useEffect(() => {
    observer.current = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && status === "CanLoadMore") {
          if (!singleUse || (singleUse && !used)) {
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

  return (
    <div ref={target} className="flex w-full items-center justify-center">
      {children}
    </div>
  );
}
