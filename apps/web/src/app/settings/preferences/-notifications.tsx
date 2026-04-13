import { useState } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useMutation } from "convex/react";

import { api } from "@acme/db/api";
import { userQueries } from "@acme/features/lib/queries";
import { Switch } from "@acme/ui/switch";

import { InfoCard } from "~/components/info-card";

export function Notifications() {
  const { data: newsletterStatus } = useSuspenseQuery({
    ...userQueries.newsletterPreference(),
    select: (data) => data ?? true,
  });

  const updatePref = useMutation(api.mail.newsletter.updatePreference);
  const [checked, setChecked] = useState(newsletterStatus);

  return (
    <InfoCard title="Notifications">
      <div className="flex items-center gap-4">
        <span className="font-medium">Weekly newsletter</span>
        <Switch
          checked={checked}
          onCheckedChange={(value: boolean) => {
            setChecked(value);
            void updatePref({ status: value });
          }}
        />
      </div>
    </InfoCard>
  );
}
