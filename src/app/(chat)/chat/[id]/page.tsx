import { api } from "@/convex/_generated/api";
import MessageList from "@/features/message/components/message-list";
import { preloadQuery } from "convex/nextjs";

export default async function ChatPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const preloadedMessages = await preloadQuery(api.threads.getThreadMessages, {
    threadId: id,
  });
  return <MessageList preloadedMessages={preloadedMessages} />;
}
