import { useEffect } from "react";

export function usePageTitle(
  title: string | null | undefined,
  fallback: string = "QBE",
) {
  useEffect(() => {
    if (title) {
      document.title = title;
    }

    return () => {
      document.title = fallback;
    };
  }, [title, fallback]);
}
