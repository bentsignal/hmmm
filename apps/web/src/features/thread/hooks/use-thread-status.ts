import { useConvexAuth, useQuery } from "convex/react";

import { api } from "@acme/db/api";

export default function useThreadStatus({ threadId }: { threadId: string }) {
  const { isAuthenticated } = useConvexAuth();
  const args = isAuthenticated ? { threadId } : "skip";
  const threadState = useQuery(api.ai.thread.getState, args);
  const isThreadIdle = threadState === "idle";
  return { isThreadIdle };
}
