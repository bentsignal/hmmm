import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";

import { authedQuery } from "../../convex_helpers";
import { getLatestEvent } from "./state";

export const get = authedQuery({
  args: {
    paginationOpts: paginationOptsValidator,
    search: v.string(),
  },
  handler: async (ctx, args) => {
    const { paginationOpts, search } = args;
    const threads =
      search.trim().length > 0
        ? await ctx.db
            .query("threads")
            .withSearchIndex("title", (q) =>
              q.search("title", search).eq("userId", ctx.user.subject),
            )
            .paginate(paginationOpts)
        : await ctx.db
            .query("threads")
            .withIndex("by_user_time", (q) => q.eq("userId", ctx.user.subject))
            .order("desc")
            .paginate(paginationOpts);
    const page = await Promise.all(
      threads.page.map(async (thread) => ({
        id: thread._id,
        updatedAt: thread.updatedAt ?? thread._creationTime,
        title: thread.title ?? "",
        latestEvent: await getLatestEvent(ctx, thread._id),
        pinned: thread.pinned ?? false,
      })),
    );
    return {
      ...threads,
      page,
    };
  },
});
