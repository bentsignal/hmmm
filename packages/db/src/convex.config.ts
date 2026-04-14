import agent from "@convex-dev/agent/convex.config";
import aggregate from "@convex-dev/aggregate/convex.config";
import migrations from "@convex-dev/migrations/convex.config";
import polar from "@convex-dev/polar/convex.config";
import rateLimiter from "@convex-dev/rate-limiter/convex.config";
import resend from "@convex-dev/resend/convex.config";
import shardedCounter from "@convex-dev/sharded-counter/convex.config";
import { defineApp } from "convex/server";

const app = defineApp();

// NOTE: the `@convex-dev/agent` component is intentionally still mounted
// here. All of its functionality has been inlined into `packages/db/src/agent/`,
// but the cutover migration (`migrations.ts: inlineAgentCutover`) needs to
// read from `components.agent.*` to copy old threads into the new tables.
// Once that migration has run in production, this `app.use(agent)` line
// (and the npm package + migration) should be removed in a follow-up PR.
app.use(agent);
app.use(migrations);
app.use(polar);
app.use(rateLimiter);
app.use(shardedCounter);
app.use(resend);

app.use(aggregate, { name: "aggregateUsage" });
app.use(aggregate, { name: "aggregateStorage" });

export default app;
