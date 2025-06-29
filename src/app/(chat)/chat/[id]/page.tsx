import MessageListWrapper from "@/features/message/components/message-list-wrapper";
import { PageError } from "@/components/error-boundary";

export default async function ChatPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <PageError>
      <MessageListWrapper threadId={id} />
    </PageError>
  );
}
