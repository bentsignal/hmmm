import { createFileRoute } from "@tanstack/react-router";
import { useConvexAuth } from "convex/react";

import ErrorBoundary, { PageError } from "~/components/error-boundary";
import Composer from "~/features/composer";
import Thread from "~/features/thread";

export const Route = createFileRoute("/_chat/chat/$id")({
  component: ChatPage,
});

function ChatPage() {
  const { id } = Route.useParams();
  const { isAuthenticated } = useConvexAuth();

  return (
    <PageError>
      <Thread threadId={id} />
      <div className="absolute right-0 bottom-0 left-0 z-50">
        <ErrorBoundary>
          <Composer authed={isAuthenticated} />
        </ErrorBoundary>
      </div>
    </PageError>
  );
}
