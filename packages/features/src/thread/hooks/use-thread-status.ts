// eslint-disable-next-line no-restricted-imports -- non-suspending useQuery is intentional so callers (e.g., the XR composer reacting to activeThread changes) don't trigger a suspense boundary on every thread switch
import { useQuery } from "@tanstack/react-query";

import { threadQueries } from "../../lib/queries";

export function useThreadStatus({ threadId }: { threadId: string }) {
  const { data: isThreadIdle } = useQuery({
    ...threadQueries.state(threadId),
    select: (state) => state === "idle",
  });
  return { isThreadIdle };
}
