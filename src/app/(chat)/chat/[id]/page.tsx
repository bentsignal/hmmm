import MessageList from "@/features/message/components/message-list";
import ErrorBoundary from "@/components/error-boundary";

export default async function ChatPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <ErrorBoundary>
      <MessageList threadId={id} />
    </ErrorBoundary>
  );
}
