"use client";

import { useConvexAuth, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

export default function ThreadTitleUpdater({ threadId }: { threadId: string }) {
  const { isAuthenticated } = useConvexAuth();
  const args = isAuthenticated ? { threadId } : "skip";
  const title = useQuery(api.ai.thread.getThreadTitle, args);

  if (title) {
    document.title = title;
  }

  return null;
}
