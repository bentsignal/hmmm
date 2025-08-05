"use client";

import { useState } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Preloaded,
  useConvexAuth,
  useMutation,
  usePreloadedQuery,
} from "convex/react";
import { api } from "@/convex/_generated/api";
import Abyss from "@/components/abyss";
import ErrorBoundary from "@/components/error-boundary";
import Logo from "@/components/logo";
import { Button } from "@/components/ui/button";
import { Loader } from "@/components/ui/loader";
import { cn } from "@/lib/utils";
import UsageChatCallout from "@/features/billing/components/usage-chat-callout";
import useUsage from "@/features/billing/hooks/use-usage";
import Composer from "@/features/composer";
import useSendMessage from "@/features/composer/hooks/use-send-message";

export default function Home({
  preloadedSuggestions,
  authed,
}: {
  preloadedSuggestions: Preloaded<
    typeof api.agents.prompts.prompt_queries.getSuggestions
  >;
  authed: boolean;
}) {
  const [isLoading, setIsLoading] = useState(false);

  // when user sends prompt, instantly show loading spinner
  if (isLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <Loader variant="dots" size="sm" />
      </div>
    );
  }

  return (
    <div className="flex w-full flex-1 flex-col items-center justify-center gap-2">
      <Logo size={50} containerClass="my-6" />
      <div className="my-2 flex flex-col items-center gap-2">
        <div className="flex items-center gap-2">
          <span className="text-2xl font-bold">Welcome back</span>
        </div>
        <span className="text-muted-foreground text-lg font-semibold">
          How can I help you today?
        </span>
      </div>
      <div className="w-full">
        <ErrorBoundary>
          <Composer showInstantLoad={() => setIsLoading(true)} />
        </ErrorBoundary>
      </div>
      <UsageChatCallout />
      <HomePrompts
        triggerLoading={() => setIsLoading(true)}
        preloadedSuggestions={preloadedSuggestions}
      />
      {!authed && (
        <Button asChild className="mt-2">
          <Link href="/sign-up" className="text-lg font-semibold">
            Get Started
          </Link>
        </Button>
      )}
    </div>
  );
}

const HomePrompts = ({
  triggerLoading,
  preloadedSuggestions,
}: {
  triggerLoading: () => void;
  preloadedSuggestions: Preloaded<
    typeof api.agents.prompts.prompt_queries.getSuggestions
  >;
}) => {
  const { isAuthenticated } = useConvexAuth();
  const { usage } = useUsage();
  const { sendMessage } = useSendMessage();

  const prompts = usePreloadedQuery(preloadedSuggestions);
  const incrementSuggestion = useMutation(
    api.agents.prompts.prompt_mutations.incrementSuggestion,
  );

  if (usage?.limitHit) {
    return null;
  }

  return (
    <div className="relative mx-auto w-full max-w-2xl">
      <Abyss height={50} top={false} />
      <div
        className={cn(
          "flex w-full flex-col items-start gap-2 px-4 pb-12 text-sm",
          "max-h-[300px] min-h-[300px] overflow-y-auto",
          "scrollbar-thin scrollbar-thumb-transparent scrollbar-track-transparent",
        )}
      >
        {prompts?.map((prompt) => (
          <span
            key={prompt._id}
            className={`bg-card/50 text-card-foreground hover:bg-accent w-full rounded-lg p-4 
            shadow-md transition-all duration-300 hover:cursor-pointer`}
            onClick={() => {
              if (!isAuthenticated) {
                redirect("/sign-up");
              }
              triggerLoading();
              incrementSuggestion({ id: prompt._id });
              sendMessage({ prompt: prompt.prompt });
            }}
          >
            {prompt.prompt}
          </span>
        ))}
      </div>
    </div>
  );
};
