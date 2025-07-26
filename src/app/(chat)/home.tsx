"use client";

import { useState } from "react";
import ErrorBoundary from "@/components/error-boundary";
import Logo from "@/components/logo";
import { Loader } from "@/components/ui/loader";
import UsageChatCallout from "@/features/billing/components/usage-chat-callout";
import useUsage from "@/features/billing/hooks/use-usage";
import Composer from "@/features/composer";
import useSendMessage from "@/features/composer/hooks/use-send-message";

export default function Home() {
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
      <HomePrompts triggerLoading={() => setIsLoading(true)} />
    </div>
  );
}

const HomePrompts = ({ triggerLoading }: { triggerLoading: () => void }) => {
  const { usage } = useUsage();
  const { sendMessage } = useSendMessage();

  const prompts = [
    "Who was the first person to argue that the Earth revolves around the sun?",
    "Does my pet truly understand what I'm saying?",
    "Why haven't we been able to find a cure for cancer?",
  ];

  if (usage?.limitHit) {
    return null;
  }

  return (
    <div className="flex px-4 flex-col gap-2 text-sm w-full items-start max-w-2xl animate-in fade-in duration-1000">
      {prompts.map((prompt) => (
        <span
          key={prompt}
          className={`p-4 bg-card/50 text-card-foreground rounded-lg shadow-md w-full 
            hover:bg-accent hover:cursor-pointer transition-all duration-300`}
          onClick={() => {
            triggerLoading();
            sendMessage({ prompt });
          }}
        >
          {prompt}
        </span>
      ))}
    </div>
  );
};
