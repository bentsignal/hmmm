"use client";

import { useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import DefaultLoading from "@/components/default-loading";
import { tryCatch } from "@/lib/utils";

export default function NewPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const { isSignedIn, isLoaded } = useUser();

  const createThread = useMutation(
    api.thread.thread_mutations.requestNewThread,
  );

  // if you are logged in, create a new thread and redirect to it
  useEffect(() => {
    const handleRedirect = async () => {
      // wait for auth to load
      if (!isLoaded) return;

      // parse query
      const query = searchParams.get("q");
      let parsedQuery = "";
      if (query) {
        try {
          parsedQuery = decodeURIComponent(query.replace(/\+/g, " "));
        } catch {
          parsedQuery = query.replace(/\+/g, " ");
        }
      }

      if (parsedQuery.length === 0) {
        router.push("/");
        return;
      }

      // auth check
      if (!isSignedIn) {
        const redirectParams = new URLSearchParams();
        redirectParams.set("q", parsedQuery);
        const url = `/login?redirect_url=/new?${redirectParams.toString()}`;
        router.push(url);
        return;
      }

      // create new thread and redirect to it
      const { data: threadId, error } = await tryCatch(
        createThread({
          prompt: parsedQuery,
        }),
      );

      if (error) {
        console.error(error);
        router.push("/");
        return;
      }

      router.push(`/chat/${threadId}`);
    };

    handleRedirect();
  }, [isLoaded, isSignedIn, searchParams, router, createThread]);

  // send you to home page after 10 seconds if you aren't redirected
  useEffect(() => {
    const forceRedirect = setTimeout(() => {
      router.push("/");
    }, 10000);

    return () => clearTimeout(forceRedirect);
  }, []);

  return (
    <div className="flex h-screen w-screen items-center justify-center">
      <DefaultLoading />
    </div>
  );
}
