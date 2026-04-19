import { mutationOptions } from "@tanstack/react-query";
import { useConvexMutation } from "@convex-dev/react-query";

import { api } from "@acme/db/api";

export function useThreadMutations() {
  return {
    rename: mutationOptions({
      mutationKey: ["thread-rename"],
      mutationFn: useConvexMutation(api.ai.thread.title.rename),
    }),
  };
}
