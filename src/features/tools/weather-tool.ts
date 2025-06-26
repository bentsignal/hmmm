import { tool } from "ai";
import { z } from "zod";
import { generateText } from "ai";
import modelMap from "../models/types/model-map";
import { searchModel as weatherModelInfo } from "../models/types/models";

export const getWeather = tool({
  description: `Get the current weather at a location. Use the data returned
  to provide a concise response to the user's question.`,
  parameters: z.object({
    query: z
      .string()
      .describe(
        "The query about what weather information the user is looking for",
      ),
  }),
  execute: async ({ query }) => {
    if (!weatherModelInfo) {
      throw new Error("Weather model info not found");
    }
    const weatherModel = modelMap.get(weatherModelInfo.id);
    if (!weatherModel) {
      throw new Error("Weather model not found");
    }
    const response = await generateText({
      model: weatherModel,
      prompt: query,
      system: `You are a weather assistant. Responsed to the query in a conscise manner. Do not cite any sources.`,
    });
    const weatherData = response.text;
    return weatherData;
  },
});
