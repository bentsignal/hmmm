import { Exa } from "exa-js";

export * from "./date_time_tool";
export * from "./weather_tool";
export * from "./current_events_tool";

const EXA_API_KEY = process.env.EXA_API_KEY;
if (!EXA_API_KEY) {
  throw new Error("EXA_API_KEY is not set");
}

export const exa = new Exa(EXA_API_KEY);
