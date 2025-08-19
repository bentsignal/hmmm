import kv from "@/kv";
import { createTool } from "@convex-dev/agent";
import { z } from "zod";
import { exa, formatCacheKey, logSearchCost } from "./tool_helpers";
import { getCurrentDateTime } from "@/lib/date-time-utils";
import { tryCatch } from "@/lib/utils";

const NUM_RESULTS = 5;

export const currentEvents = createTool({
  description: `

  This tool is used to get information about current events happening around the 
  world.
  
  It will return an array of source objects that are the results from the search 
  query. The source objects will have the following fields:

  - url: the url of the source
  - content: the page content of the source
  - title: the title of the source
  - favicon: the favicon of the source
  - image: the image of the source

  Use the **content** field of each object in the list to create an informed and 
  helpful response to address the user's question directly.

  It will also return the current date and time, which can be used to determine
  how current the information returned from the sources is.

  `,
  args: z.object({
    query: z
      .string()
      .min(1)
      .max(300)
      .describe(
        "A full sentence query describing the current events you want to know about",
      ),
  }),
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  handler: async (ctx, args, options) => {
    // check cache
    const cacheKey = formatCacheKey("current-events", [args.query]);
    const cachedSources = await kv.get(cacheKey);
    if (cachedSources) {
      return cachedSources;
    }

    const { data: response, error: responseError } = await tryCatch(
      exa.searchAndContents(args.query, {
        numResults: NUM_RESULTS,
        text: {
          maxCharacters: 5000,
        },
        excludeDomains: ["www.youtube.com"],
      }),
    );
    if (responseError) {
      console.error("Error during current events tool call", responseError);
      return null;
    }

    // log usage
    if (ctx.userId) {
      await logSearchCost(ctx, NUM_RESULTS, ctx.userId);
    }

    const sources = response.results.map((result) => ({
      url: result.url,
      content: result.text,
      title: result.title,
      favicon: result.favicon,
      image: result.image,
    }));

    // write to cache
    await kv.set(cacheKey, sources, {
      ex: 60 * 10, // 10 minutes
    });

    const dateTime = getCurrentDateTime({
      timezone: "America/New_York",
    });

    return {
      sources,
      currentDateTime: {
        timezone: "America/New_York",
        dateTime,
      },
    };
  },
});
