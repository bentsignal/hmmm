import type { NotificationSettings } from "@decentralized-convex/messages";
import type { PdsOptimisticLocalStore } from "@decentralized-convex/tanstack-query";
import { useQueries } from "@tanstack/react-query";
import { pdsQuery } from "@decentralized-convex/tanstack-query";
import { pds } from "@vera/backend/pds";

import { useAccounts } from "~/features/messaging/account";
import { pdsResultOr } from "~/features/messaging/results";

export type NotificationKind = keyof NotificationSettings;

function showSetting(
  store: PdsOptimisticLocalStore,
  change: Partial<NotificationSettings>,
) {
  const request = pds.messages.notificationSettings({});
  const settings = store.getQuery(request);
  if (settings != null) store.setQuery(request, { ...settings, ...change });
}

/**
 * Which notifications you get. They're set the same for every signed-in
 * account (each account's server sends its own pushes), so the screen
 * shows the first account's and a change goes to all of them. Accounts on
 * servers without these settings are left out; `settings` is null when no
 * account has them.
 */
export function useNotificationSettings() {
  const accounts = useAccounts();
  const results = useQueries({
    queries: accounts.map((account) =>
      pdsQuery({
        args: {},
        // The home PDS answers; null when it can't (an older server).
        options: {
          select: (result) => {
            const answer = pdsResultOr(result, null);
            return answer === undefined ? undefined : (answer?.[0] ?? null);
          },
        },
        query: pds.messages.notificationSettings,
        session: account.address,
      }),
    ),
  });
  const supported = accounts.filter((_, index) => results[index]?.data != null);
  const settings = results.find((result) => result.data != null)?.data;
  const answered = results.every((result) => result.data !== undefined);
  return {
    settings: settings ?? (answered ? null : undefined),
    /** Turns one kind on or off for every account, showing it right away. */
    set: (kind: NotificationKind, on: boolean) =>
      Promise.all(
        supported.map((account) =>
          account.pds.mutate(
            pds.messages.setNotificationSettings({ [kind]: on }),
            { optimisticUpdate: (store) => showSetting(store, { [kind]: on }) },
          ),
        ),
      ),
  };
}
