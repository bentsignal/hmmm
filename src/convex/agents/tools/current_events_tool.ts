import { createTool } from "@convex-dev/agent";
import { z } from "zod";
import { exa } from "./index";
import { logSearchCost } from "./tool_helpers";
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
    // auth check
    if (!ctx.userId) {
      console.error("Error during current events tool call: No user ID");
      return null;
    }

    // TODO: check cache

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
    await logSearchCost(ctx, NUM_RESULTS, ctx.userId);

    return {
      sources: response.results.map((result) => ({
        url: result.url,
        content: result.text,
        title: result.title,
        favicon: result.favicon,
        image: result.image,
      })),
    };
  },
});
