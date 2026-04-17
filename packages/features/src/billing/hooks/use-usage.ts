// eslint-disable-next-line no-restricted-imports -- useQuery needed here because usage data is read outside of route loaders (nested components); route auth guard ensures the query only runs when signed in
import { useQuery } from "@tanstack/react-query";
import { convexQuery } from "@convex-dev/react-query";

import { api } from "@acme/db/api";

export function useUsage() {
  const {
    data: usage,
    isLoading: usageLoading,
    error: usageError,
  } = useQuery({
    ...convexQuery(api.user.usage.getUsage, {}),
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
