import { auth } from "@clerk/nextjs/server";
import ErrorBoundary, { PageError } from "@/components/error-boundary";
import Composer from "@/features/composer";
import Thread from "@/features/thread";

export default async function ChatPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { userId } = await auth();
  const authed = userId !== null;
  return (
    <PageError>
      <Thread threadId={id} />
      <div className="absolute right-0 bottom-0 left-0 z-50">
        <ErrorBoundary>
          <Composer authed={authed} />
        </ErrorBoundary>
      </div>
    </PageError>
  );
}
