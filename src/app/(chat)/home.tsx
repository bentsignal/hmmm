import { Button } from "@/components/ui/button";
import { Box } from "lucide-react";
import Link from "next/link";
import Composer from "@/features/composer/components";
import ErrorBoundary from "@/components/error-boundary";

export default async function Home() {
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
          <Composer />
        </ErrorBoundary>
      </div>
      <Button asChild variant="outline">
        <Link href="/xr">
          <Box className="h-4 w-4" />
          Enter XR
        </Link>
      </Button>
    </div>
  );
}
