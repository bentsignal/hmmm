import { createFileRoute } from "@tanstack/react-router";

import ErrorBoundary, { PageError } from "~/components/error-boundary";
import Composer from "~/features/composer";
import Thread from "~/features/thread";
import { threadQueries } from "~/lib/queries";

export const Route = createFileRoute("/_chat/_authenticated/chat/$id")({
  component: ChatPage,
  loader: async ({ context, params }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(
        threadQueries.messagesFirstPage(params.id),
      ),
      context.queryClient.ensureQueryData(threadQueries.state(params.id)),
      context.queryClient.ensureQueryData(threadQueries.title(params.id)),
      context.queryClient.ensureQueryData(threadQueries.followUps(params.id)),
    ]);
  },
});

function ChatPage() {
  const { id } = Route.useParams();

  return (
    <PageError>
      <Thread threadId={id} />
      <div className="absolute right-0 bottom-0 left-0 z-50">
        <ErrorBoundary>
          <Composer authed={true} />
        </ErrorBoundary>
      </div>
    </PageError>
  );
}
