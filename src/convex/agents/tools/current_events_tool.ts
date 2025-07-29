import { createTool } from "@convex-dev/agent";
import { Exa } from "exa-js";
import { z } from "zod";
import { internal } from "@/convex/_generated/api";
import { tryCatch } from "@/lib/utils";

const EXA_API_KEY = process.env.EXA_API_KEY;
if (!EXA_API_KEY) {
  throw new Error("EXA_API_KEY is not set");
}

const exa = new Exa(EXA_API_KEY);

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
        numResults: 5,
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
    // TODO: write to cache
    // log usage
    await ctx.runMutation(internal.sub.usage.logToolCallUsage, {
      userId: ctx.userId,
      cost: 0.005,
    });
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
