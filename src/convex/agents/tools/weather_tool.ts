import { createTool } from "@convex-dev/agent";
import { z } from "zod";

const GOOGLE_WEATHER_API_KEY = process.env.GOOGLE_WEATHER_API_KEY;
if (!GOOGLE_WEATHER_API_KEY) {
  throw new Error("GOOGLE_WEATHER_API_KEY is not set");
}

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
  handler: async (ctx, args, options) => {
    console.log(options);

    // get lat and long for location
    const latLongResponse = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${args.location}&key=${GOOGLE_WEATHER_API_KEY}`,
    );
    const latLongData = await latLongResponse.json();
    const { lat, lng } = latLongData.results[0].geometry.location;

    const base = "https://weather.googleapis.com";
    const shared = `key=${GOOGLE_WEATHER_API_KEY}&location.latitude=${lat}&location.longitude=${lng}&unitsSystem=${args.unitSystem}`;

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
      default:
        return null;
        break;
    }

    if (!url) {
      return null;
    }

    const weatherResponse = await fetch(url);
    const weatherData = await weatherResponse.json();

    // TODO: Log usage
    // await ctx.runMutation(api.sub.usage.loc);

    return weatherData;
  },
});
