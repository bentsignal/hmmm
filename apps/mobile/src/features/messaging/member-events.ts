import type { Conversation, MemberEvent } from "@decentralized-convex/messages";
// eslint-disable-next-line no-restricted-imports -- Expo Router has no route loaders to preload suspense queries.
import { useQuery } from "@tanstack/react-query";
import { pdsQuery } from "@decentralized-convex/tanstack-query";
import { pds } from "@vera/backend/pds";

import type { MemberNotice, Message } from "~/features/conversation/types";
import { useAccount } from "./account";
import { useProfileState } from "./profiles";
import { pdsResultOr } from "./results";

/**
 * Each event's notice from the last render, so rows stay the same object
 * and the list doesn't redraw them.
 */
const notices = new WeakMap<MemberEvent, MemberNotice>();

function noticeOf(event: MemberEvent, name: string) {
  const known = notices.get(event);
  if (known?.name === name) return known;
  const notice = {
    accountId: event.accountId,
    at: new Date(event.at),
    id: event.eventId,
    kind: event.kind,
    name,
  } satisfies MemberNotice;
  notices.set(event, notice);
  return notice;
}

/**
 * A group's joins and leaves among its loaded messages, oldest first.
 * Other conversations have none, and neither does a PDS from before them.
 */
export function useMemberNotices(
  conversationId: string,
  conversation: Pick<Conversation, "kind"> | undefined,
  shown: {
    hasNewer: boolean;
    hasOlder: boolean;
    messages: readonly Message[];
  },
) {
  const { address } = useAccount();
  const isGroup = conversation?.kind === "group";
  const { data } = useQuery(
    pdsQuery({
      args: { conversationId },
      options: {
        enabled: isGroup,
        select: (result) => pdsResultOr(result, []),
      },
      query: pds.messages.memberEvents,
      session: address,
    }),
  );
  const events = isGroup ? data : [];
  // People who left aren't members any more, so their names load here.
  const profiles = useProfileState(
    (events ?? []).map(({ accountId }) => accountId),
  );
  return {
    /** Until the events and everyone's names are in. */
    isLoading: events === undefined || profiles.isLoading,
    notices: noticesWithin(
      (events ?? []).map((event) =>
        noticeOf(event, profiles.profileOf(event.accountId).displayName),
      ),
      shown,
    ),
  };
}

/**
 * The notices among the loaded messages: none past the oldest while older
 * messages haven't loaded, or past the newest while newer ones haven't.
 */
function noticesWithin(
  all: readonly MemberNotice[],
  {
    hasNewer,
    hasOlder,
    messages,
  }: { hasNewer: boolean; hasOlder: boolean; messages: readonly Message[] },
) {
  const oldest = messages[0]?.sentAt.getTime();
  const newest = messages.at(-1)?.sentAt.getTime();
  if ((hasOlder && oldest === undefined) || (hasNewer && newest === undefined))
    return [];
  return all.filter((notice) => {
    const at = notice.at.getTime();
    if (hasOlder && oldest !== undefined && at < oldest) return false;
    return !(hasNewer && newest !== undefined && at > newest);
  });
}
