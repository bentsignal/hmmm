// eslint-disable-next-line no-restricted-imports -- useQuery needed here because plan data is fetched conditionally based on auth state (hook renders on public /pricing too), not preloaded in route loader
import { useQuery } from "@tanstack/react-query";
import { convexQuery, useConvexAuth } from "@convex-dev/react-query";

import { api } from "@acme/db/api";

export function useCurrentPlan() {
  const { isAuthenticated } = useConvexAuth();
  const args = isAuthenticated ? {} : "skip";
  const {
    data: myPlan,
    isPending: planLoading,
    error: planError,
  } = useQuery({
    ...convexQuery(api.user.subscription.getPlan, args),
    select: ({ name, price, max }) => ({ name, price, max }),
  });

  return { myPlan, planLoading, planError };
}
