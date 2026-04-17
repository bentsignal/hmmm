// eslint-disable-next-line no-restricted-imports -- useQuery needed here because plan data is read outside of route loaders (nested components); route auth guard ensures the query only runs when signed in
import { useQuery } from "@tanstack/react-query";
import { convexQuery } from "@convex-dev/react-query";

import { api } from "@acme/db/api";

export function useCurrentPlan() {
  const {
    data: myPlan,
    isPending: planLoading,
    error: planError,
  } = useQuery({
    ...convexQuery(api.user.subscription.getPlan, {}),
    select: ({ name, price, max }) => ({ name, price, max }),
  });

  return { myPlan, planLoading, planError };
}
