import kv from "@/kv";
import { createTool } from "@convex-dev/agent";
import { z } from "zod";
import { exa } from "./index";
import { formatCacheKey, logSearchCost } from "./tool_helpers";
import { tryCatch } from "@/lib/utils";

const NUM_RESULTS = 5;
const MAX_CHARACTERS = 3000;

export const positionHolder = createTool({
  description: `

  This tool is used to determine who currently holds a position that is subject
  to change, such as the president of the United States or the CEO of a company.
  
  It will return an array of source objects that are the results from the search 
  query. The source objects will have the following fields:

  - url: the url of the source
  - content: the page content of the source
  - title: the title of the source
  - favicon: the favicon of the source
  - image: the image of the source

  Use the **content** field of each object in the list to create an informed and 
  helpful response to address the user's question directly.

  **IMPORTANT**: Before using this tool, you must always use the _dateTime_ tool
  first. That way, you can ensure that the information you get back from this
  tool is up to date. You should prioritize the most recent information returned 
  from this tool.

  `,
  args: z.object({
    query: z
      .string()
      .min(1)
      .max(300)
      .describe(
        "A full sentence query describing the position you want to know about",
      ),
    position: z
      .string()
      .min(1)
      .max(100)
      .describe("The position you want to know about"),
    group: z
      .string()
      .min(1)
      .max(100)
      .describe(
        "The name of the group, company, or organization you want to know about",
      ),
  }),
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  handler: async (ctx, args, options) => {
    // auth check
    if (!ctx.userId) {
      console.error("Error during current events tool call: No user ID");
      return null;
    }

    // check cache
    const cacheKey = formatCacheKey("position-holder", [
      args.position,
      args.group,
    ]);
    const cachedResult = await kv.get(cacheKey);
    if (cachedResult) {
      return cachedResult;
    }

    const { data: response, error: responseError } = await tryCatch(
      exa.searchAndContents(args.query, {
        numResults: NUM_RESULTS,
        text: {
          maxCharacters: MAX_CHARACTERS,
        },
      }),
    );
    if (responseError) {
      console.error("Error during current events tool call", responseError);
      return null;
    }

    // log usage
    await logSearchCost(ctx, NUM_RESULTS, ctx.userId);

    const sources = response.results.map((result) => ({
      url: result.url,
      content: result.text,
      title: result.title,
      favicon: result.favicon,
      image: result.image,
    }));

    // write to cache
    await kv.set(
      cacheKey,
      {
        sources,
      },
      { ex: 60 * 60 }, // 1 hour
    );

    return sources;
  },
});
