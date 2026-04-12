import { useSuspenseQuery } from "@tanstack/react-query";

import { threadQueries } from "~/lib/queries";

export default function useThreadStatus({ threadId }: { threadId: string }) {
  const { data: isThreadIdle } = useSuspenseQuery({
    ...threadQueries.state(threadId),
    select: (state) => state === "idle",
  });
  return { isThreadIdle };
}
