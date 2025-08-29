import { fetchQuery } from "convex/nextjs";
import { api } from "@/convex/_generated/api";
import InfoForm from "./info-form";
import InfoCard from "@/components/info-card";
import { getAuthToken } from "@/features/auth/util";

export default async function PersonalInfo() {
  const token = await getAuthToken();
  const data = await fetchQuery(api.user.info.get, {}, { token });
  return (
    <InfoCard title="Personalization">
      <InfoForm initial={data} />
    </InfoCard>
  );
}
