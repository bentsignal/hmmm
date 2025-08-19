import { convexQuery, useConvexAuth } from "@convex-dev/react-query";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/convex/_generated/api";

export default function useUsage() {
  const { isAuthenticated } = useConvexAuth();
  const args = isAuthenticated ? {} : "skip";
  const {
    data: usage,
    isLoading: usageLoading,
    error: usageError,
  } = useQuery(convexQuery(api.user.usage.getUsage, args));
  return { usage, usageLoading, usageError };
}
