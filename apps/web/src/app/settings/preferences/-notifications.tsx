import { useQuery } from "convex/react";

import { api } from "@acme/db/api";

import NewsletterToggle from "~/app/settings/preferences/-newsletter-toggle";
import InfoCard from "~/components/info-card";

export default function Notifications() {
  const newsletterStatus = useQuery(api.mail.newsletter.getUserPreference);

  return (
    <InfoCard title="Notifications">
      <NewsletterToggle preference={newsletterStatus ?? true} />
    </InfoCard>
  );
}
