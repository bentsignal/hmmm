import { createTool } from "@convex-dev/agent";
import { z } from "zod";
import { internal } from "@/convex/_generated/api";
import { env } from "@/convex/convex.env";
import kv from "@/convex/kv";
import { formatCacheKey } from "./tool_helpers";
import { tryCatch } from "@/lib/utils";

export const weather = createTool({
  description: `

  This tool is used to get the current weather for a given location. It can be 
  used to gather the current weather conditions, the upcoming day by day 
  forecast (up to 10 days), the upcoming hourly forecast (up to 1 day of 
  hourly data), or the last 24 hours of weather data.

  Use the data returned to create an informed and helpful response to address the 
  user's question directly. 

  `,
  args: z.object({
    location: z
      .string()
      .min(1)
      .max(300)
      .describe(
        `The location to get the weather for. Specify as city name, state code (only 
        for the US) and country code divided by comma. Please use ISO 3166 country 
        codes.`,
      ),
    queryType: z
      .enum([
        "current-conditions",
        "daily-forecast",
        "hourly-forecast",
        "last-24-hours",
      ])
      .describe("The type of weather query to make"),
    days: z
      .number()
      .min(1)
      .max(10)
      .default(1)
      .describe("The number of days to get the weather for."),
    unitSystem: z.enum(["METRIC", "IMPERIAL"]).describe(
      `If the location for the weather uses the metric system, present the temperature 
      in Celsius. If the location for the weather uses the imperial system, present the 
      temperature in Fahrenheit.`,
    ),
  }),
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  handler: async (ctx, args, options) => {
    // check cache
    const cacheKey = formatCacheKey("weather", [
      args.location,
      args.queryType,
      args.days.toString(),
      args.unitSystem,
    ]);
    const cachedWeather = await kv.get(cacheKey);
    if (cachedWeather) {
      return cachedWeather;
    }

    // get lat and long for location
    const { data: coordinates, error: coordinatesError } = await tryCatch(
      getCoordinates(args.location),
    );
    if (coordinatesError) {
      console.error(
        "Error during weather tool call: Coordinates error",
        coordinatesError,
      );
      return null;
    }
    // construct url for weather api
    const base = "https://weather.googleapis.com";
    const shared = `key=${env.GOOGLE_API_KEY}&location.latitude=${coordinates.lat}&location.longitude=${coordinates.lng}&unitsSystem=${args.unitSystem}`;
    let url;
    switch (args.queryType) {
      case "current-conditions":
        url = `${base}/v1/currentConditions:lookup?${shared}`;
        break;
      case "daily-forecast":
        url = `${base}/v1/forecast/days:lookup?${shared}&days=${args.days}&pageSize=${args.days}`;
        break;
      case "hourly-forecast":
        url = `${base}/v1/forecast/hours:lookup?${shared}&hours=24&pageSize=24`;
        break;
      case "last-24-hours":
        url = `${base}/v1/history/hours:lookup?${shared}&hours=${24}&pageSize=${24}`;
        break;
    }

    // get weather data
    const { data: weatherData, error: weatherError } = await tryCatch(
      getWeather(url),
    );
    if (weatherError) {
      console.error(
        "Error during weather tool call: Weather data retrieval error",
        weatherError,
      );
      return null;
    }

    // write to cache
    let ttl;
    switch (args.queryType) {
      case "current-conditions":
        ttl = 60 * 10; // 10 minutes
        break;
      case "daily-forecast":
        ttl = 60 * 60; // 1 hour
        break;
      case "hourly-forecast":
        ttl = 60 * 10; // 10 minutes
        break;
      case "last-24-hours":
        ttl = 60 * 10; // 10 minutes
        break;
    }
    await kv.set(cacheKey, weatherData, { ex: ttl });

    // log usage
    if (ctx.userId) {
      await ctx.runMutation(internal.user.usage.log, {
        userId: ctx.userId,
        cost: 0.01,
        type: "tool_call",
      });
    }

    return weatherData;
  },
});

const getCoordinates = async (location: string) => {
  const geocodingResponse = await fetch(
    `https://maps.googleapis.com/maps/api/geocode/json?address=${location}&key=${env.GOOGLE_API_KEY}`,
  );
  const geocodingData = await geocodingResponse.json();
  const { lat, lng } = geocodingData.results[0].geometry.location;
  return { lat, lng };
};

const getWeather = async (url: string) => {
  const weatherResponse = await fetch(url);
  const weatherData = await weatherResponse.json();
  return weatherData;
};
