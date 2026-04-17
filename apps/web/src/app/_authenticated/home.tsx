import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { HomeHero } from "@/features/home/home-hero";
import { HomeSuggestions } from "@/features/home/home-suggestions";

import { suggestionQueries } from "@acme/features/lib/queries";
import { Loader } from "@acme/ui/loader";

import { UsageChatCallout } from "~/features/billing/components/usage-chat-callout";
import { Composer } from "~/features/composer/composer";
import { useSendMessage } from "~/features/composer/hooks/use-send-message";

export const Route = createFileRoute("/_authenticated/home")({
  component: Home,
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(suggestionQueries.getCurrent());
  },
});

function Home() {
  const [isLoading, setIsLoading] = useState(false);
  const { sendMessage } = useSendMessage();

  if (isLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <Loader variant="dots" size="sm" />
      </div>
    );
  }

  function showInstantLoad() {
    setIsLoading(true);
  }
  function handleError() {
    setIsLoading(false);
  }

  return (
    <div className="flex w-full flex-1 flex-col items-center justify-center gap-2">
      <HomeHero />
      <div className="w-full">
        <Composer
          showInstantLoad={showInstantLoad}
          handleError={handleError}
          authed={true}
        />
      </div>
      <HomeSuggestions
        onSelect={(prompt) =>
          void sendMessage({
            customPrompt: prompt,
            showInstantLoad,
            handleError,
          })
        }
      />
      <UsageChatCallout />
    </div>
  );
}
