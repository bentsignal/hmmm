import { useSuspenseQuery } from "@tanstack/react-query";

import { threadQueries } from "~/lib/queries";

export default function useThreadStatus({ threadId }: { threadId: string }) {
  const { data: threadState } = useSuspenseQuery(threadQueries.state(threadId));
  const isThreadIdle = threadState === "idle";
  return { isThreadIdle };
}
