"use client";

import { useState } from "react";
import Cookies from "js-cookie";
import InfoCard from "@/components/info-card";
import { Switch } from "@/components/ui/switch";

export default function Experimental() {
  const [xrChecked, setXrChecked] = useState(Cookies.get("xr") === "true");
  return (
    <InfoCard title="Experimental">
      <div className="flex flex-col gap-2">
        <Feature
          title="XR"
          checked={xrChecked}
          setChecked={(value: boolean) => {
            setXrChecked(value);
            Cookies.set("xr", value.toString());
          }}
          note="Show/hide XR button on home page"
        />
      </div>
    </InfoCard>
  );
}

const Feature = ({
  title,
  checked,
  setChecked,
  note,
}: {
  title: string;
  checked: boolean;
  setChecked: (value: boolean) => void;
  note?: string;
}) => {
  return (
    <div className="flex items-center gap-2">
      <Switch checked={checked} onCheckedChange={setChecked} />
      <span className="text-primary font-bold">{title}</span>
      {note && <span className="text-muted-foreground text-sm">{note}</span>}
    </div>
  );
};
