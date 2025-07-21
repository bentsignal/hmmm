"use client";

import { useState } from "react";
import { Box } from "lucide-react";
import Link from "next/link";
import ErrorBoundary from "@/components/error-boundary";
import { Button } from "@/components/ui/button";
import { Loader } from "@/components/ui/loader";
import UsageChatCallout from "@/features/billing/components/usage-chat-callout";
import Composer from "@/features/composer";

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
      <Button variant="outline">
        <Link href="/xr" className="flex items-center gap-2">
          <Box className="h-4 w-4" />
          Enter XR
        </Link>
      </Button>
    </div>
  );
}
