"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Switch } from "@/components/ui/switch";

export default function NewsletterToggle({
  preference,
}: {
  preference: boolean;
}) {
  const updatePref = useMutation(api.mail.newsletter.updatePreference);
  const [checked, setChecked] = useState(preference);

  return (
    <div className="flex items-center gap-4">
      <span className="font-medium">Daily newsletter</span>
      <Switch
        checked={checked}
        onCheckedChange={(value: boolean) => {
          setChecked(value);
          updatePref({ status: value });
        }}
      />
    </div>
  );
}
