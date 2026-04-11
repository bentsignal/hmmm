import { useQuery } from "convex/react";

import { api } from "@acme/db/api";

import { PageFallback } from "~/components/error-boundary";
import InfoCard from "~/components/info-card";

export default function AccountInfo() {
  const email = useQuery(api.user.account.getEmail);

  if (email === undefined) {
    return null;
  }

  if (email === null) {
    return <PageFallback />;
  }

  return (
    <InfoCard title="Information">
      <div className="flex gap-1">
        <span className="text-foreground font-bold">Email:</span>
        <span className="">{email}</span>
      </div>
    </InfoCard>
  );
}
