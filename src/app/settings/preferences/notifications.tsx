import NewsletterToggle from "@/app/settings/preferences/newsletter-toggle";
import { fetchQuery } from "convex/nextjs";
import { api } from "@/convex/_generated/api";
import InfoCard from "@/components/info-card";
import { getAuthToken } from "@/features/auth/util";

export default async function Notifications() {
  const token = await getAuthToken();

  // is user subbed to newsletter?
  const newsletterStatus = await fetchQuery(
    api.mail.newsletter.getUserPreference,
    {},
    { token },
  );

  return (
    <InfoCard title="Notifications">
      <NewsletterToggle preference={newsletterStatus ?? true} />
    </InfoCard>
  );
}
