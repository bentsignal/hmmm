import { defineOperation } from "@decentralized-convex/plugin";
import { v } from "convex/values";

import { inboxThread, threadListingPage } from "./shapes.ts";

/** The queries that list threads, part of `messagesProtocol`. */
export const threadListQueries = {
  /**
   * A conversation's threads, newest reply first, `THREAD_PAGE_SIZE` (or
   * `limit`) older than `before`: only yours with `mine`, or those whose
   * text matches `search`. Each member's PDS lists the replies it stores.
   */
  threads: defineOperation({
    args: v.object({
      before: v.optional(v.number()),
      conversationId: v.string(),
      limit: v.optional(v.number()),
      mine: v.optional(v.boolean()),
      search: v.optional(v.string()),
    }),
    returns: threadListingPage,
  }),
  /**
   * The threads you follow, newest reply first, at most
   * `MAX_INBOX_THREADS`, leaving out what `activity` leaves out.
   */
  inboxThreads: defineOperation({
    args: v.object({}),
    returns: v.array(inboxThread),
  }),
};
