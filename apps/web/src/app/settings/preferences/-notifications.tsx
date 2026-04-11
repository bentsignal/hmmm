import { useSuspenseQuery } from "@tanstack/react-query";

import NewsletterToggle from "~/app/settings/preferences/-newsletter-toggle";
import InfoCard from "~/components/info-card";
import { userQueries } from "~/lib/queries";

export default function Notifications() {
  const { data: newsletterStatus } = useSuspenseQuery(
    userQueries.newsletterPreference(),
  );

  return (
    <InfoCard title="Notifications">
      <NewsletterToggle preference={newsletterStatus ?? true} />
    </InfoCard>
  );
}
