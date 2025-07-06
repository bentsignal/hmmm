import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { fetchQuery } from "convex/nextjs";
import { api } from "@/convex/_generated/api";
import { getAuthToken } from "@/features/auth/util/auth-util";
import { PageFallback } from "@/components/error-boundary";
import { tryCatch } from "@/lib/utils";
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
    fetchQuery(api.users.getUserEmail, {}, { token }),
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
