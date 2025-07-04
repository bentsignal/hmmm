import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { getAuthToken } from "@/features/auth/util/auth-util";
import { tryCatch } from "@/lib/utils";
import { fetchQuery } from "convex/nextjs";
import { api } from "@/convex/_generated/api";
import { PageFallback } from "@/components/error-boundary";

export default async function Usage() {
  const { userId } = await auth();
  if (!userId) {
    redirect("/login");
  }
  const token = await getAuthToken();
  const { data: usage, error } = await tryCatch(
    fetchQuery(api.messages.getUsage, {}, { token }),
  );
  console.log(usage);
  if (error || usage === null) {
    console.error(error);
    return <PageFallback />;
  }
  const start = new Date(usage.start).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const end = new Date(usage.end).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  return (
    <Card className="w-full">
      <CardContent className="flex flex-col gap-4">
        <span className="text-xl font-bold">Usage</span>
        <span className="text-muted-foreground text-sm">
          {start} - {end}
        </span>
        <span className="font-bold">
          Total:{" "}
          <span className="text-muted-foreground font-normal">
            ${usage.total.toFixed(2)}
          </span>
        </span>
      </CardContent>
    </Card>
  );
}
