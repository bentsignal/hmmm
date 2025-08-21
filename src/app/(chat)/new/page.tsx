import { Suspense } from "react";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { fetchMutation } from "convex/nextjs";
import { api } from "@/convex/_generated/api";
import Redirector from "./redirector";
import DefaultLoading from "@/components/default-loading";
import { tryCatch } from "@/lib/utils";
import { getAuthToken } from "@/features/auth/util";

interface NewPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function NewPage({ searchParams }: NewPageProps) {
  return (
    <Suspense fallback={<DefaultLoading />}>
      <Processor searchParams={searchParams} />
    </Suspense>
  );
}

const Processor = async ({ searchParams }: NewPageProps) => {
  // parse query
  const params = await searchParams;
  const query = params.q as string;

  let parsedQuery = "";
  if (query) {
    try {
      parsedQuery = decodeURIComponent(query.replace(/\+/g, " "));
    } catch {
      parsedQuery = query.replace(/\+/g, " ");
    }
  }

  if (parsedQuery.length === 0) {
    redirect("/");
  }

  // auth check
  const { userId } = await auth();
  if (!userId) {
    const redirectParams = new URLSearchParams();
    redirectParams.set("q", parsedQuery);
    const url = "/login?redirect_url=/new?" + redirectParams.toString();
    redirect(url);
  }

  // create new thread
  const authToken = await getAuthToken();
  const { data: threadId, error } = await tryCatch(
    fetchMutation(
      api.ai.thread.create,
      {
        prompt: parsedQuery,
      },
      { token: authToken },
    ),
  );
  if (error || !threadId) {
    console.error(error);
    redirect("/");
  }

  // redirect to new thread client side to avoid re rendering the sidebar;
  return <Redirector threadId={threadId} />;
};
