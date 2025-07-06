import MessageList from "@/features/message/components/message-list";
import ErrorBoundary, { PageError } from "@/components/error-boundary";
import Composer from "@/features/composer/components";

export default async function ChatPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <PageError>
      <MessageList threadId={id} />
      <div className="absolute right-0 bottom-0 left-0 z-50">
        <ErrorBoundary>
          <Composer />
        </ErrorBoundary>
      </div>
    </PageError>
  );
}
