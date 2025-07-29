import { createTool } from "@convex-dev/agent";
import { Exa } from "exa-js";
import { z } from "zod";

const EXA_API_KEY = process.env.EXA_API_KEY;
if (!EXA_API_KEY) {
  throw new Error("EXA_API_KEY is not set");
}

const exa = new Exa(EXA_API_KEY);

export const weather = createTool({
  description: `

  This tool is used to get the current weather for a given location. It can be 
  used to get the current weather, or the upcoming forecast. It will not return
  historical weather data. If you need historical weather data, you should use 
  your own knowledge and reasoning to answer the user's question. If you do not 
  possess the knowledge to answer the user's question, tell them that you do not 
  have the knowledge to answer the question.
  
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
        "A full sentence query describing the weather you want to know about",
      ),
  }),
  handler: async (ctx, args, options) => {
    console.log(options);
    const today = new Date().toISOString().slice(0, 10);
    console.log(today);

    const searchConfig = {
      numResults: 3,
      startPublishedDate: today,
      includeDomains: [
        "www.accuweather.com",
        "www.weather.com",
        "www.timeanddate.com",
      ],
      text: {
        maxCharacters: 1000,
      },
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
