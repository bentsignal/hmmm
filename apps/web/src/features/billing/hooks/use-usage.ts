// eslint-disable-next-line no-restricted-imports -- useQuery needed here because usage data is fetched conditionally based on auth state, not preloaded in route loader
import { useQuery } from "@tanstack/react-query";
import { convexQuery, useConvexAuth } from "@convex-dev/react-query";

import { api } from "@acme/db/api";

export default function useUsage() {
  const { isAuthenticated } = useConvexAuth();
  const args = isAuthenticated ? {} : "skip";
  const {
    data: usage,
    isLoading: usageLoading,
    error: usageError,
  } = useQuery({
    ...convexQuery(api.user.usage.getUsage, args),
    select: ({ endOfPeriod, percentageUsed, limitHit, range, unlimited }) => ({
      endOfPeriod,
      percentageUsed,
      limitHit,
      range,
      unlimited,
    }),
  });
  return { usage, usageLoading, usageError };
}
