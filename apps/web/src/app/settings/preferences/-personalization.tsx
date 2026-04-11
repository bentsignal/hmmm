import { useQuery } from "convex/react";

import { api } from "@acme/db/api";
import { getPublicLanguageModels } from "@acme/db/models";

import InfoCard from "~/components/info-card";
import UserInfoForm from "./-user-info-form";

export default function Personalization() {
  const userInfo = useQuery(api.user.info.get);
  const showModelSelector = useQuery(api.user.subscription.showModelSelector);

  const publicModels = getPublicLanguageModels();

  if (userInfo === undefined || showModelSelector === undefined) {
    return null;
  }

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
