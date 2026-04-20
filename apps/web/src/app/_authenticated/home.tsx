import { createFileRoute } from "@tanstack/react-router";
import { HomeHero } from "@/features/home/home-hero";
import { HomeSuggestions } from "@/features/home/home-suggestions";

import { suggestionQueries } from "@acme/features/lib/queries";

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
  const { sendMessage } = useSendMessage();

  return (
    <div className="flex w-full flex-1 flex-col items-center justify-center gap-2">
      <HomeHero />
      <div className="w-full">
        <Composer />
      </div>
      <HomeSuggestions
        onSelect={(prompt) => void sendMessage({ customPrompt: prompt })}
      />
      <UsageChatCallout />
    </div>
  );
}
