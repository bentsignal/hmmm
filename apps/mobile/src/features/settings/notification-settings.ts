import type { NotificationSettings } from "@decentralized-convex/messages";
import type { PdsOptimisticLocalStore } from "@decentralized-convex/tanstack-query";
import { useQueries } from "@tanstack/react-query";
import { pdsQuery } from "@decentralized-convex/tanstack-query";
import { pds } from "@vera/backend/pds";

import { useAccounts } from "~/features/messaging/account";
import { pdsResult } from "~/features/messaging/results";

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
 * shows the first account's and a change goes to all of them.
 */
export function useNotificationSettings() {
  const accounts = useAccounts();
  const results = useQueries({
    queries: accounts.map((account) =>
      pdsQuery({
        args: {},
        // The home PDS answers.
        options: { select: (result) => pdsResult(result)?.[0] },
        query: pds.messages.notificationSettings,
        session: account.address,
      }),
    ),
  });
  const settings = results[0]?.data;
  return {
    isLoading: settings === undefined,
    settings,
    /** Turns one kind on or off for every account, showing it right away. */
    set: (kind: NotificationKind, on: boolean) =>
      Promise.all(
        accounts.map((account) =>
          account.pds.mutate(
            pds.messages.setNotificationSettings({ [kind]: on }),
            { optimisticUpdate: (store) => showSetting(store, { [kind]: on }) },
          ),
        ),
      ),
  };
}
