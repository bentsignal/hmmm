"use client";

import { useConvexAuth, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

export default function ThreadTitleUpdater({ threadId }: { threadId: string }) {
  const { isAuthenticated } = useConvexAuth();
  const args = isAuthenticated ? { threadId } : "skip";
  const title = useQuery(api.thread.thread_queries.getThreadTitle, args);

  if (title) {
    document.title = title;
  }

  return null;
}
