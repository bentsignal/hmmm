import { fetchQuery } from "convex/nextjs";
import { api } from "@/convex/_generated/api";
import { getPublicLanguageModels } from "@/convex/ai/models";
import UserInfoForm from "./user-info-form";
import InfoCard from "@/components/info-card";
import { getAuthToken } from "@/features/auth/util";

export default async function Personalization() {
  const token = await getAuthToken();

  const [userInfo, showModelSelector] = await Promise.all([
    fetchQuery(api.user.info.get, {}, { token }),
    fetchQuery(api.user.subscription.showModelSelector, {}, { token }),
  ]);

  const publicModels = getPublicLanguageModels();

  return (
    <InfoCard title="Personalization">
      <UserInfoForm
        userInfo={userInfo}
        showModelSelector={showModelSelector}
        models={publicModels}
      />
    </InfoCard>
  );
}
