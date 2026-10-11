import type { LinkCard } from "@decentralized-convex/messages";
import { useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import { previewedUrls } from "@decentralized-convex/messages";
import { pdsMutation, pdsQuery } from "@decentralized-convex/tanstack-query";
import { pds } from "@vera/backend/pds";

import {
  useSearchQuery,
  useSearchText,
} from "~/features/search/use-search-query";
import { useAccount } from "./account";
import { pdsResultOr } from "./results";

/**
 * Previews of the links in a message being typed. Once typing pauses, the
 * PDS starts fetching them, so they're ready when the message is sent:
 * `cardsFor` gives the cards a message starts with, and the PDS gives the
 * sent message the same ones.
 */
export function useLinkPrefetch() {
  const { address: session } = useAccount();
  const { mutate } = useMutation(
    pdsMutation({ mutation: pds.messages.prefetchLinkPreviews, session }),
  );
  // The links last asked for, so pausing again doesn't ask again.
  const asked = useRef("");
  const text = useSearchText({
    onSettle: (value) => {
      const urls = previewedUrls(value);
      const key = urls.join(" ");
      if (urls.length === 0 || key === asked.current) return;
      asked.current = key;
      // Only a head start: the send fetches whatever this didn't.
      mutate({ urls }, { onError: () => undefined });
    },
  });
  const urls = previewedUrls(text.query);
  const prefetched = useSearchQuery({
    options: pdsQuery({
      args: { urls },
      options: {
        enabled: urls.length > 0,
        // A PDS from before prefetching has nothing to give.
        select: (result) => pdsResultOr(result, []),
      },
      query: pds.messages.linkPreviews,
      session,
    }),
    query: text.query,
  });

  return {
    /** Pass every change to the message field. */
    onChangeText: text.onChangeText,
    /** The cards a message with this body starts with. */
    cardsFor: (body: string): LinkCard[] =>
      previewedUrls(body).map(
        (link) =>
          prefetched.data?.find((card) => card.link === link) ?? { link },
      ),
  };
}
