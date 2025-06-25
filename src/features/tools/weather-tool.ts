import { tool } from "ai";
import { z } from "zod";

export const getWeather = tool({
  description: `Get the current weather at a location. Use the data returned
  to provide a concise response to the user's question.`,
  parameters: z.object({
    latitude: z.number(),
    longitude: z.number(),
  }),
  execute: async ({ latitude, longitude }) => {
    /*

      maybe just hit perplexity or exa. which is cheaper, which is faster?

    */
    const response = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m&hourly=temperature_2m&daily=sunrise,sunset&timezone=auto`,
    );
    const weatherData = await response.json();
    return weatherData;
  },
});
