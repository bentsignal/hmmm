import { createFileRoute } from "@tanstack/react-router";

import { SettingsWrapper } from "~/app/settings/-wrapper";
import { InfoCard } from "~/components/info-card";
import { Socials } from "~/components/socials";
import { QuickLink } from "~/features/quick-link/quick-link";

export const Route = createFileRoute("/_chat/_authenticated/settings/contact")({
  component: ContactPage,
});

function ContactPage() {
  return (
    <SettingsWrapper>
      <InfoCard title="Support">
        <span className="text-muted-foreground my-2 text-sm">
          If you have any questions or concerns, please contact us at{" "}
          <span className="text-primary font-bold underline">
            <a href="mailto:support@bsx.sh">support@bsx.sh</a>
          </span>
        </span>
        <div className="flex flex-col gap-2">
          <span className="text-primary text-sm font-bold underline">
            <QuickLink to="/policy/privacy">Privacy Policy</QuickLink>
          </span>
          <span className="text-primary text-sm font-bold underline">
            <QuickLink to="/policy/terms">Terms of Service</QuickLink>
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
