import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { fetchMutation } from "convex/nextjs";
import { api } from "@/convex/_generated/api";
import { tryCatch } from "@/lib/utils";
import { getAuthToken } from "@/features/auth/util/auth-util";

export default async function NewPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  // auth check
  const { userId } = await auth();
  if (!userId) {
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
  const authToken = await getAuthToken();
  const { data: threadId, error } = await tryCatch(
    fetchMutation(
      api.thread.thread_mutations.requestNewThread,
      {
        message: parsedQuery,
      },
      { token: authToken },
    ),
  );
  if (error || !threadId) {
    console.error(error);
    redirect("/");
  }

  // redirect to new thread;
  redirect(`/chat/${threadId}`);
}
