import { auth } from "@clerk/nextjs/server";
import { fetchMutation, fetchQuery } from "convex/nextjs";
import { redirect } from "next/navigation";
import { api } from "@/convex/_generated/api";
import { models } from "@/features/models/types/models";
import { env } from "@/env";

export default async function NewPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  // auth check
  const { userId } = await auth();
  if (!userId) {
    redirect("/login");
  }
  const isSubscribed = await fetchQuery(api.auth.externalSubCheck, {
    userId,
  });
  if (!isSubscribed) {
    redirect("/login");
  }

  // parse query
  const params = await searchParams;
  const query = params.q as string;
  const parsedQuery = query
    ? decodeURIComponent(query.replace(/\+/g, " "))
    : "";
  if (parsedQuery.length === 0) {
    redirect("/");
  }

  // create new thread
  const threadId = await fetchMutation(api.threads.requestNewThreadCreation, {
    message: parsedQuery,
    modelId: models[0].id,
    key: env.CONVEX_INTERNAL_API_KEY,
    userId,
  });
  if (!threadId) {
    redirect("/");
  }

  // redirect to new thread;
  redirect(`/chat/${threadId}`);
}
