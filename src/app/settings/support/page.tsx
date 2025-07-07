import { auth } from "@clerk/nextjs/server";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";

export default async function Support() {
  const { userId } = await auth();
  if (!userId) {
    redirect("/login");
  }
  return (
    <div className="flex w-full flex-col gap-4">
      <Card className="w-full">
        <CardContent className="flex flex-col gap-2">
          <span className="text-xl font-bold">Support</span>
          <span className="text-sm text-muted-foreground my-2">
            If you have any questions or concerns, please contact us at{" "}
            <span className="text-primary font-bold underline">
              <Link href="mailto:support@bsx.sh">support@bsx.sh</Link>
            </span>
          </span>
          <span className="text-primary font-bold underline text-sm">
            <Link href="/policy/privacy">Privacy Policy</Link>
          </span>
          <span className="text-primary font-bold underline text-sm">
            <Link href="/policy/terms">Terms of Service</Link>
          </span>
        </CardContent>
      </Card>
    </div>
  );
}
