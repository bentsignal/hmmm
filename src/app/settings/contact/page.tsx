import SettingsWrapper from "@/app/settings/wrapper";
import { auth } from "@clerk/nextjs/server";
import Link from "next/link";
import { redirect } from "next/navigation";
import InfoCard from "@/components/info-card";
import Socials from "@/components/socials";

export default async function Contact() {
  const { userId } = await auth();
  if (!userId) {
    redirect("/login");
  }
  return (
    <SettingsWrapper>
      <InfoCard title="Support">
        <span className="text-muted-foreground my-2 text-sm">
          If you have any questions or concerns, please contact us at{" "}
          <span className="text-primary font-bold underline">
            <Link href="mailto:support@bsx.sh">support@bsx.sh</Link>
          </span>
        </span>
        <div className="flex flex-col gap-2">
          <span className="text-primary text-sm font-bold underline">
            <Link href="/policy/privacy">Privacy Policy</Link>
          </span>
          <span className="text-primary text-sm font-bold underline">
            <Link href="/policy/terms">Terms of Service</Link>
          </span>
        </div>
      </InfoCard>
      <InfoCard title="Socials">
        <div className="flex w-full items-center justify-start gap-2">
          <Socials />
        </div>
      </InfoCard>
    </SettingsWrapper>
  );
}
