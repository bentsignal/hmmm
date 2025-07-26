"use client";

import { useState } from "react";
import ErrorBoundary from "@/components/error-boundary";
import Logo from "@/components/logo";
import { Loader } from "@/components/ui/loader";
import UsageChatCallout from "@/features/billing/components/usage-chat-callout";
import Composer from "@/features/composer";
import useSendMessage from "@/features/composer/hooks/use-send-message";

export default function Home() {
  const [isLoading, setIsLoading] = useState(false);
  const { sendMessage } = useSendMessage();

  // when user sends prompt, instantly show loading spinner
  if (isLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <Loader variant="dots" size="sm" />
      </div>
    );
  }

  const prompts = [
    "Who was the most influential person in the 20th century?",
    "Does my pet truly understand what I'm saying?",
    "Why haven't we been able to find a cure for cancer?",
  ];

  return (
    <div className="flex w-full flex-1 flex-col items-center justify-center gap-2">
      <Logo size={50} containerClass="my-6" />
      <div className="flex items-center gap-2">
        <span className="text-2xl font-bold">Welcome back</span>
      </div>
      <span className="text-muted-foreground text-lg font-semibold">
        How can I help you today?
      </span>
      <div className="w-full">
        <ErrorBoundary>
          <Composer showInstantLoad={() => setIsLoading(true)} />
        </ErrorBoundary>
      </div>
      <UsageChatCallout />
      <div className="flex px-4 flex-col gap-2 text-sm w-full items-start max-w-2xl">
        {prompts.map((prompt) => (
          <span
            key={prompt}
            className={`p-4 bg-card/50 text-card-foreground rounded-lg shadow-md w-full 
            hover:bg-accent hover:cursor-pointer transition-all duration-300`}
            onClick={() => {
              setIsLoading(true);
              sendMessage({ prompt });
            }}
          >
            {prompt}
          </span>
        ))}
      </div>
    </div>
  );
}
