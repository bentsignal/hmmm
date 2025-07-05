import { Button } from "@/components/ui/button";
import { Box } from "lucide-react";
import Link from "next/link";

export default async function Home() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-2">
      <div className="flex items-center gap-2">
        <span className="text-2xl font-bold">Welcome back</span>
      </div>
      <span className="text-muted-foreground text-lg font-semibold">
        How can I help you today?
      </span>
      <Button asChild className="mt-2" variant="outline">
        <Link href="/xr">
          <Box className="h-4 w-4" />
          Enter XR
        </Link>
      </Button>
    </div>
  );
}
