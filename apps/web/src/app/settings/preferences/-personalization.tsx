import { useSuspenseQuery } from "@tanstack/react-query";

import { getPublicLanguageModels } from "@acme/db/models/helpers";

import InfoCard from "~/components/info-card";
import { userQueries } from "~/lib/queries";
import UserInfoForm from "./-user-info-form";

export default function Personalization() {
  const { data: userInfo } = useSuspenseQuery({
    ...userQueries.info(),
    select: (data) => data ?? null,
  });
  const { data: showModelSelector } = useSuspenseQuery({
    ...userQueries.showModelSelector(),
    select: (data) => Boolean(data),
  });

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
