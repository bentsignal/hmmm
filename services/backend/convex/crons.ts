import { cronJobs } from "convex/server";

import { internal } from "./_generated/api";

const crons = cronJobs();

// Tells people how the bugs they reported to support are going.
crons.interval(
  "follow bug reports",
  { minutes: 10 },
  internal.supportReports.track,
  {},
);

export default crons;
