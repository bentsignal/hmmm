import { convexQuery } from "@convex-dev/react-query";

import { api } from "@acme/db/api";

import { INITIAL_PAGE_SIZE as MESSAGE_PAGE_SIZE } from "~/features/messages/config";
import { INITIAL_PAGE_SIZE as THREAD_LIST_PAGE_SIZE } from "~/features/thread/config";

export const pricingQueries = {
  listAllProducts: () => convexQuery(api.polar.listAllProducts, {}),
};

export const threadQueries = {
  listFirstPage: (search = "") =>
    convexQuery(api.ai.thread.queries.getThreadList, {
      search,
      paginationOpts: {
        numItems: THREAD_LIST_PAGE_SIZE,
        cursor: null,
      },
    }),
  messagesFirstPage: (threadId: string) =>
    convexQuery(api.ai.thread.queries.getThreadMessages, {
      threadId,
      paginationOpts: {
        numItems: MESSAGE_PAGE_SIZE,
        cursor: null,
      },
      streamArgs: { kind: "list" },
    }),
  state: (threadId: string) =>
    convexQuery(api.ai.thread.queries.getState, { threadId }),
  title: (threadId: string) =>
    convexQuery(api.ai.thread.queries.getTitle, { threadId }),
  followUps: (threadId: string) =>
    convexQuery(api.ai.thread.queries.getFollowUpQuestions, { threadId }),
};

export const suggestionQueries = {
  getCurrent: () => convexQuery(api.ai.suggestions.getCurrent, {}),
};

export const userQueries = {
  info: () => convexQuery(api.user.info.get, {}),
  usage: () => convexQuery(api.user.usage.getUsage, {}),
  plan: () => convexQuery(api.user.subscription.getPlan, {}),
  showModelSelector: () =>
    convexQuery(api.user.subscription.showModelSelector, {}),
  email: () => convexQuery(api.user.account.getEmail, {}),
  newsletterPreference: () =>
    convexQuery(api.mail.newsletter.getUserPreference, {}),
};
