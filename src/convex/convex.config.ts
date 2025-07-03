import { defineApp } from "convex/server";
import agent from "@convex-dev/agent/convex.config";
import migrations from "@convex-dev/migrations/convex.config";
import aggregate from "@convex-dev/aggregate/convex.config";
import polar from "@convex-dev/polar/convex.config";

const app = defineApp();

app.use(agent);
app.use(migrations);
app.use(polar);

app.use(aggregate);
app.use(aggregate, { name: "aggregateUsage" });

export default app;
