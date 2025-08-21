import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { fetchQuery } from "convex/nextjs";
import { api } from "@/convex/_generated/api";
import { getAuthToken } from "@/features/auth/util";
import NewsletterToggle from "@/features/settings/components/newsletter-toggle";
import SettingsBangs from "@/features/settings/components/settings-bangs";
import SettingsCard from "@/features/settings/components/settings-card";
import Shortcuts from "@/features/shortcuts/components";

export default async function Settings() {
  // auth check
  const { userId } = await auth();
  const token = await getAuthToken();
  if (!userId) {
    redirect("/login");
  }

  // is user subbed to newsletter?
  const newsletterStatus = await fetchQuery(
    api.mail.newsletter.getUserPreference,
    {},
    { token },
  );

  return (
    <div className="flex flex-col gap-4">
      <SettingsCard title="Notifications">
        <NewsletterToggle preference={newsletterStatus ?? true} />
      </SettingsCard>
      <SettingsCard title="Shortcuts">
        <Shortcuts />
      </SettingsCard>
      <SettingsCard title="Search">
        <SettingsBangs />
      </SettingsCard>
    </div>
  );
}
