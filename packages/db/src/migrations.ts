import { Migrations } from "@convex-dev/migrations";

import type { DataModel } from "./_generated/dataModel.js";
import { components } from "./_generated/api.js";

export const migrations = new Migrations<DataModel>(components.migrations);
export const run = migrations.runner();

// The `inlineAgentCutover` and `resetMigratedThreads` migrations that lived
// here as part of the agent component → inline cutover have been removed
// after running in production. See git history for the implementation.
