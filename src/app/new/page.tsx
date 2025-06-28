import { auth } from "@clerk/nextjs/server";
import { fetchMutation } from "convex/nextjs";
import { redirect } from "next/navigation";
import { api } from "@/convex/_generated/api";
import { getAuthToken } from "@/features/auth/util/auth-util";
import { tryCatch } from "@/lib/utils";

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
      api.threads.requestNewThreadCreation,
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
