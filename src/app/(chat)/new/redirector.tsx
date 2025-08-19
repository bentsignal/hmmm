"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import DefaultLoading from "@/components/default-loading";

export default function Redirector({ threadId }: { threadId: string }) {
  const router = useRouter();
  useEffect(() => {
    router.push(`/chat/${threadId}`);
  }, [router, threadId]);

  return <DefaultLoading />;
}
