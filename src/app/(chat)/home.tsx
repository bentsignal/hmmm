"use client";

import { useState } from "react";
// import { Box } from "lucide-react";
import Link from "next/link";
import { Preloaded, useMutation, usePreloadedQuery } from "convex/react";
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
  preloadedSuggestions: Preloaded<typeof api.ai.suggestions.getCurrent>;
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
          <Composer
            showInstantLoad={() => setIsLoading(true)}
            handleError={() => setIsLoading(false)}
          />
        </ErrorBoundary>
      </div>
      <HomePrompts
        showInstantLoad={() => setIsLoading(true)}
        handleError={() => setIsLoading(false)}
        preloadedSuggestions={preloadedSuggestions}
      />
      <UsageChatCallout />
      {!authed && (
        <Button asChild className="mt-2">
          <Link href="/sign-up" className="text-lg font-semibold">
            Get Started
          </Link>
        </Button>
      )}
      {/* (
        <Button asChild className="mt-2">
          <Link href="/xr" className="flex items-center gap-2">
            <Box className="h-4 w-4" />
            <span className="">Enter XR</span>
          </Link>
        </Button>
      ) :  */}
    </div>
  );
}

const HomePrompts = ({
  showInstantLoad,
  handleError,
  preloadedSuggestions,
}: {
  showInstantLoad: () => void;
  handleError: () => void;
  preloadedSuggestions: Preloaded<typeof api.ai.suggestions.getCurrent>;
}) => {
  const { usage } = useUsage();
  const { sendMessage } = useSendMessage();

  const prompts = usePreloadedQuery(preloadedSuggestions);
  const incrementClickCount = useMutation(
    api.ai.suggestions.incrementClickCount,
  );

  return (
    <div className="relative mx-auto w-full max-w-2xl mask-b-from-80%">
      <Abyss height={100} top={false} />
      <div
        className={cn(
          "flex w-full flex-col items-start gap-2 px-4 pb-12 text-sm",
          "max-h-[350px] min-h-[350px] overflow-y-auto",
          "scrollbar-thin scrollbar-thumb-transparent scrollbar-track-transparent",
        )}
      >
        {prompts?.map((prompt) => (
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
              incrementClickCount({ id: prompt._id });
              sendMessage({
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
