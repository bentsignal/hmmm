import { useState } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation } from "convex/react";
import { Box } from "lucide-react";

import { api } from "@acme/db/api";
import { QuickLink } from "@acme/features/quick-link";
import { Button } from "@acme/ui/button";
import { Loader } from "@acme/ui/loader";

import Abyss from "~/components/abyss";
import Logo from "~/components/logo";
import UsageChatCallout from "~/features/billing/components/usage-chat-callout";
import useUsage from "~/features/billing/hooks/use-usage";
import Composer from "~/features/composer";
import useSendMessage from "~/features/composer/hooks/use-send-message";
import { suggestionQueries } from "~/lib/queries";
import { cn } from "~/lib/utils";

export const Route = createFileRoute("/_chat/")({
  component: Home,
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(suggestionQueries.getCurrent());
  },
});

function Home() {
  const { auth } = Route.useRouteContext({
    select: (ctx) => ({ auth: ctx.auth }),
  });
  const showXr = /(?:^|; )xr=([^;]*)/.exec(document.cookie)?.[1] === "true";
  const authed = auth.isSignedIn;

  const [isLoading, setIsLoading] = useState(false);

  // when user sends prompt, instantly show loading spinner
  if (isLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <Loader variant="dots" size="sm" />
      </div>
    );
  }

  const hero = authed ? "Welcome back" : "Welcome";

  return (
    <div className="flex w-full flex-1 flex-col items-center justify-center gap-2">
      <Logo className="my-2" />
      <div className="my-2 flex flex-col items-center gap-2">
        <div className="flex items-center gap-2">
          <span className="text-2xl font-bold">{hero}</span>
        </div>
        <span className="text-muted-foreground text-lg font-semibold">
          How can I help you today?
        </span>
      </div>
      <div className="w-full">
        <Composer
          showInstantLoad={() => setIsLoading(true)}
          handleError={() => setIsLoading(false)}
          authed={authed}
        />
      </div>
      <HomePrompts
        showInstantLoad={() => setIsLoading(true)}
        handleError={() => setIsLoading(false)}
      />
      <UsageChatCallout />
      {!authed && (
        <Button asChild className="mt-2">
          <QuickLink to="/sign-up" className="text-lg font-semibold">
            Get Started
          </QuickLink>
        </Button>
      )}
      {authed && showXr && (
        <Button asChild className="mt-2">
          <QuickLink to="/xr" className="flex items-center gap-2">
            <Box className="h-4 w-4" />
            <span className="">Enter XR</span>
          </QuickLink>
        </Button>
      )}
    </div>
  );
}

const HomePrompts = ({
  showInstantLoad,
  handleError,
}: {
  showInstantLoad: () => void;
  handleError: () => void;
}) => {
  const { usage } = useUsage();
  const { sendMessage } = useSendMessage();

  const { data: prompts } = useSuspenseQuery({
    ...suggestionQueries.getCurrent(),
    select: (data) => data.map((d) => ({ _id: d._id, prompt: d.prompt })),
  });
  const incrementClickCount = useMutation(
    api.ai.suggestions.incrementClickCount,
  );

  return (
    <div className="relative mx-auto w-full max-w-2xl mask-b-from-80%">
      <Abyss height={100} top={false} />
      <div
        className={cn(
          "flex w-full flex-col items-start gap-2 px-4 pb-12 text-sm",
          "h-[300px] overflow-y-auto",
          "scrollbar-thin scrollbar-thumb-transparent scrollbar-track-transparent",
        )}
      >
        {prompts.map((prompt) => (
          <span
            key={prompt._id}
            className={cn(
              "bg-card/50 text-card-foreground hover:bg-card/70 w-full rounded-lg p-4 shadow-md transition-all duration-300 select-none",
              usage?.limitHit
                ? "hover:cursor-not-allowed"
                : "hover:cursor-pointer",
            )}
            role="button"
            aria-label={`Suggested homepage prompt: ${prompt.prompt}`}
            onClick={() => {
              void incrementClickCount({ id: prompt._id });
              void sendMessage({
                customPrompt: prompt.prompt,
                showInstantLoad,
                handleError,
              });
            }}
          >
            {prompt.prompt}
          </span>
        ))}
      </div>
    </div>
  );
};
