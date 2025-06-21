import MessageList from "@/features/message/components/message-list";
import { PageError } from "@/components/error-boundary";

export default async function ChatPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <PageError>
      <MessageList threadId={id} />
    </PageError>
  );
}
