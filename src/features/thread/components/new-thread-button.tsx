"use client";

import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
// import { useQuery } from "convex/react";
// import { api } from "@/convex/_generated/api";

export default function NewThreadButton() {
  const router = useRouter();
  // const threads = useQuery(api.thread.getThreads);
  return (
    <Button
      className="w-full"
      size="lg"
      onClick={() => {
        router.push("/");
      }}
    >
      <span className="font-bold">New Chat</span>
    </Button>
  );
}
