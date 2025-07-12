import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { fetchQuery } from "convex/nextjs";
import { api } from "@/convex/_generated/api";
import { PageFallback } from "@/components/error-boundary";
import { Card, CardContent } from "@/components/ui/card";
import { tryCatch } from "@/lib/utils";
import { getAuthToken } from "@/features/auth/util/auth-util";
import DeleteAccount from "@/features/settings/components/delete-accont";

export default async function Account() {
  // auth check
  const { userId } = await auth();
  if (!userId) {
    redirect("/login");
  }
  const token = await getAuthToken();

  // get user info
  const { data: email, error } = await tryCatch(
    fetchQuery(api.user.user_queries.getUserEmail, {}, { token }),
  );
  if (error || !email) {
    console.error(error);
    return <PageFallback />;
  }

  return (
    <div className="flex w-full flex-col gap-4">
      <Card className="w-full">
        <CardContent className="flex flex-col gap-4">
          <span className="text-xl font-bold">Information</span>
          <span className="font-bold">
            Email:{" "}
            <span className="text-muted-foreground font-normal">{email}</span>
          </span>
        </CardContent>
      </Card>
      <Card className="w-full">
        <CardContent className="flex flex-col gap-4">
          <span className="text-xl font-bold">Danger Zone</span>
          <DeleteAccount />
        </CardContent>
      </Card>
    </div>
  );
}
