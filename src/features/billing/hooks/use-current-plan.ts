import { convexQuery, useConvexAuth } from "@convex-dev/react-query";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/convex/_generated/api";

export default function useCurrentPlan() {
  const { isAuthenticated } = useConvexAuth();
  const args = isAuthenticated ? {} : "skip";
  const {
    data: plan,
    isPending: planLoading,
    error: planError,
  } = useQuery(convexQuery(api.sub.sub_queries.getUserPlan, args));

  return { plan, planLoading, planError };
}
