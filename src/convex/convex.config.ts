import agent from "@convex-dev/agent/convex.config";
import aggregate from "@convex-dev/aggregate/convex.config";
import migrations from "@convex-dev/migrations/convex.config";
import polar from "@convex-dev/polar/convex.config";
import rateLimiter from "@convex-dev/rate-limiter/convex.config";
import resend from "@convex-dev/resend/convex.config";
import shardedCounter from "@convex-dev/sharded-counter/convex.config";
import { defineApp } from "convex/server";

const app = defineApp();

app.use(agent);
app.use(migrations);
app.use(polar);
app.use(rateLimiter);
app.use(shardedCounter);
app.use(resend);

app.use(aggregate, { name: "aggregateUsage" });

export default app;
