"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Box } from "lucide-react";

export default function XRLink() {
  const router = useRouter();
  return (
    <Button
      className="mt-2"
      variant="outline"
      onClick={() => router.push("/xr")}
    >
      <Box className="h-4 w-4" />
      Enter XR
    </Button>
  );
}
