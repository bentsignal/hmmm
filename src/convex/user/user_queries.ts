import { internalQuery, query } from "@/convex/_generated/server";
import { getUserByUserId } from "./user_helpers";

export const getUserIdentity = internalQuery({
  args: {},
  handler: async (ctx) => {
    const user = await ctx.auth.getUserIdentity();
    return user;
  },
});

export const getUser = internalQuery({
  args: {},
  handler: async (ctx) => {
    const userId = await ctx.auth.getUserIdentity();
    if (!userId) {
      return null;
    }
    return await getUserByUserId(ctx, userId.subject);
  },
});

export const getUserEmail = query({
  args: {},
  handler: async (ctx) => {
    const userId = await ctx.auth.getUserIdentity();
    if (!userId) {
      return null;
    }
    const user = await getUserByUserId(ctx, userId.subject);
    if (!user) {
      return null;
    }
    return user.email;
  },
});

export const getNewsletterRecipients = internalQuery({
  args: {},
  handler: async (ctx) => {
    const users = await ctx.db.query("users").collect();
    const newsletterRecipients = users.filter((user) => user.newsletter);
    const emails = newsletterRecipients.map((user) => user.email);
    return emails;
  },
});
