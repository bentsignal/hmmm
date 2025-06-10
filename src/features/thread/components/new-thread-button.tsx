"use client";

import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

export default function NewThreadButton() {
  const router = useRouter();
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
