import { Migrations } from "@convex-dev/migrations";

import type { DataModel } from "./_generated/dataModel.js";
import { components, internal } from "./_generated/api.js";

export const migrations = new Migrations<DataModel>(components.migrations);
export const run = migrations.runner();

/**
 * Clears the `legacyAgentThreadId` field from every thread. Once this has
 * been run in production, the field (and its doc comment in
 * `packages/db/src/agent/schema.ts`) can be deleted from the schema.
 *
 * Run `migrations:runClearLegacyAgentThreadId` directly from the dashboard
 * (no args needed).
 */
export const clearLegacyAgentThreadId = migrations.define({
  table: "threads",
  migrateOne: (_ctx, thread) => {
    if (thread.legacyAgentThreadId === undefined) return;
    return { legacyAgentThreadId: undefined };
  },
});

export const runClearLegacyAgentThreadId = migrations.runner(
  internal.migrations.clearLegacyAgentThreadId,
);
