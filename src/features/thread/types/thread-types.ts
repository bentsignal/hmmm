import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

export type ThreadsData = NonNullable<
  ReturnType<typeof useQuery<typeof api.threads.getThreadList>>
>;
