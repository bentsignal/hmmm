import { createTool } from "@convex-dev/agent";
import { z } from "zod";

export const dateTime = createTool({
  description: `

  Used to get current date and time.

  If the user asks for the time in a specific location, use the timezone parameter
  with a valid IANA timezone identifier (e.g., "America/New_York", "Europe/London",
  "Asia/Tokyo"). If the user does not specify a location, use "America/New_York".

  Never include the timezone identifier ID in the repsponse, always translate it
  to a readable format. Ex: America/New_York would just be "New York".

  If a user only asks for the date, only use the date in your response. If they
  only ask for the time, only use the time in your response. If they ask for both,
  then use both the date and time in your response.

  Use the data returned to generate an effective response to the user's question.

  `,
  args: z.object({
    timezone: z
      .string()
      .describe(
        "IANA timezone identifier (e.g., 'America/New_York', 'Europe/London', 'Asia/Tokyo')",
      ),
  }),

  handler: async (ctx, args, options) => {
    console.log(options);

    const date = new Date();

    // get time
    const timeString = date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: args.timezone,
    });
    const [hours, minutes] = timeString.split(":").map(Number);

    // get date
    const month = date.toLocaleString("en-US", {
      month: "long",
      timeZone: args.timezone,
    });
    const day = date.toLocaleString("en-US", {
      day: "numeric",
      timeZone: args.timezone,
    });
    const year = date.toLocaleString("en-US", {
      year: "numeric",
      timeZone: args.timezone,
    });

    const result: {
      hours: number;
      minutes: number;
      timezone: string;
      month: string;
      day: string;
      year: string;
    } = {
      hours,
      minutes,
      timezone: args.timezone,
      month,
      day,
      year,
    };

    return result;
  },
});
