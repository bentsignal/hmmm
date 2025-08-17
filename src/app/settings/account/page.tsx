import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { fetchQuery } from "convex/nextjs";
import { api } from "@/convex/_generated/api";
import { PageFallback } from "@/components/error-boundary";
import { tryCatch } from "@/lib/utils";
import { getAuthToken } from "@/features/auth/util/auth-util";
import DeleteAccount from "@/features/settings/components/delete-accont";
import SettingsCard from "@/features/settings/components/settings-card";

export default async function Account() {
  // auth check
  const { userId } = await auth();
  if (!userId) {
    redirect("/login");
  }
  const token = await getAuthToken();

  // get user info
  const { data: email, error } = await tryCatch(
    fetchQuery(api.user.account.getEmail, {}, { token }),
  );
  if (error || !email) {
    console.error(error);
    return <PageFallback />;
  }

  return (
    <div className="flex w-full flex-col gap-4">
      <SettingsCard title="Information">
        <div className="flex gap-1">
          <span className="text-foreground font-bold">Email:</span>
          <span className="">{email}</span>
        </div>
      </SettingsCard>
      <SettingsCard title="Danger Zone">
        <DeleteAccount />
      </SettingsCard>
    </div>
  );
}
