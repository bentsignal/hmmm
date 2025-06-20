import ThreadList from "@/features/thread/components/thread-list";
import { auth } from "@clerk/nextjs/server";
import { preloadQuery } from "convex/nextjs";
import { api } from "@/convex/_generated/api";

export default async function ThreadListWrapper() {
  const { userId } = await auth();
  if (!userId) {
    return null;
  }
  const preloadedThreads = await preloadQuery(api.threads.getThreadList);
  return <ThreadList preloadedThreads={preloadedThreads} />;
}
