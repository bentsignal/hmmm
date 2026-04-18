import { convexQuery } from "@convex-dev/react-query";

import { api } from "@acme/db/api";

export const pricingQueries = {
  listAllProducts: () => convexQuery(api.polar.listAllProducts, {}),
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
