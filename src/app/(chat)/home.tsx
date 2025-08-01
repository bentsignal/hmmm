"use client";

import { useState } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Preloaded, useConvexAuth, usePreloadedQuery } from "convex/react";
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
}: {
  preloadedSuggestions: Preloaded<
    typeof api.agents.prompts.prompt_queries.getSuggestions
  >;
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
      <div className="flex flex-col gap-2 my-2 items-center">
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
      <Button asChild className="mt-2">
        <Link href="/sign-up" className="text-lg font-semibold">
          Get Started
        </Link>
      </Button>
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

  if (usage?.limitHit) {
    return null;
  }

  return (
    <div className="relative w-full max-w-2xl mx-auto">
      <Abyss height={50} top={false} />
      <div
        className={cn(
          "flex px-4 pb-12 flex-col gap-2 text-sm w-full items-start",
          "min-h-[300px] max-h-[300px] overflow-y-auto",
          "scrollbar-thin scrollbar-thumb-transparent scrollbar-track-transparent",
        )}
      >
        {prompts?.map((prompt) => (
          <span
            key={prompt._id}
            className={`p-4 bg-card/50 text-card-foreground rounded-lg shadow-md w-full 
            hover:bg-accent hover:cursor-pointer transition-all duration-300`}
            onClick={() => {
              if (!isAuthenticated) {
                redirect("/sign-up");
              }
              triggerLoading();
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
