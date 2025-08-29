import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { fetchQuery } from "convex/nextjs";
import { api } from "@/convex/_generated/api";
import { PageFallback } from "@/components/error-boundary";
import InfoCard from "@/components/info-card";
import { tryCatch } from "@/lib/utils";
import { getAuthToken } from "@/features/auth/util";

export default async function AccountInfo() {
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
    <InfoCard title="Information">
      <div className="flex gap-1">
        <span className="text-foreground font-bold">Email:</span>
        <span className="">{email}</span>
      </div>
    </InfoCard>
  );
}
