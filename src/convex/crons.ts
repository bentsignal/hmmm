import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.cron(
  "update-home-prompts",
  "0 0,6,12,18 * * *",
  internal.agents.prompts.prompt_actions.generateSuggestions,
);

export default crons;
