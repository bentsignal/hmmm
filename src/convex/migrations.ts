import { Migrations } from "@convex-dev/migrations";
import { components, internal } from "./_generated/api.js";
import { DataModel } from "./_generated/dataModel.js";

export const migrations = new Migrations<DataModel>(components.migrations);
export const run = migrations.runner();

export const threadMetadataBackfillTwo = migrations.define({
  table: "users",
  migrateOne: async (ctx, user) => {
    const threads = await ctx.runQuery(
      components.agent.threads.listThreadsByUserId,
      {
        userId: user.userId,
        order: "desc",
      },
    );
    // for each thread, create an entry in the new threads table
    threads.page.forEach(async (thread) => {
      const metadata = await ctx.db
        .query("threadMetadata")
        .withIndex("by_thread_id", (q) => q.eq("threadId", thread._id))
        .first();
      if (metadata) {
        return;
      }
      await ctx.db.insert("threadMetadata", {
        userId: user.userId,
        title: thread.title || "",
        threadId: thread._id,
        updatedAt: thread._creationTime,
        state: "idle",
        pinned: false,
      });
    });
  },
});

export const runThreadMetadataBackfillTwo = migrations.runner(
  internal.migrations.threadMetadataBackfillTwo,
);
