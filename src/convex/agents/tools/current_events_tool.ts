import { createTool } from "@convex-dev/agent";
import { Exa } from "exa-js";
import { z } from "zod";

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
  handler: async (ctx, args, options) => {
    console.log(options);

    const searchConfig = {
      numResults: 5,
      text: {
        maxCharacters: 5000,
      },
      // includeDomains: ["www.apnews.com"],
      excludeDomains: ["www.youtube.com"],
    };
    const response = await exa.searchAndContents(args.query, searchConfig);
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
