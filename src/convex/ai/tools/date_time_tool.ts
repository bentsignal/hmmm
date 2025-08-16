import { createTool } from "@convex-dev/agent";
import { z } from "zod";
import { getCurrentDateTime } from "@/lib/date-time-utils";

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

  Include AM/PM in the response if the user asks for the time, unless they specify
  they would like the time in 24 hour format.

  `,
  args: z.object({
    timezone: z
      .string()
      .describe(
        "IANA timezone identifier (e.g., 'America/New_York', 'Europe/London', 'Asia/Tokyo')",
      ),
  }),
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  handler: async (ctx, args, options) => {
    return getCurrentDateTime({
      timezone: args.timezone,
    });
  },
});
