// import { tool } from "ai";
// import { Exa } from "exa-js";
// import { z } from "zod";

// const EXA_API_KEY = process.env.EXA_API_KEY;
// if (!EXA_API_KEY) {
//   throw new Error("EXA_API_KEY is not set");
// }

// const exa = new Exa(EXA_API_KEY);

// export const webSearch = tool({
//   description: `

//   This tool is used to search the web for information on a topic. It will return
//   an array of source objects that are the results from the search query. The source
//   objects will have the following fields:

//   - url: the url of the source
//   - content: the page content of the source
//   - title: the title of the source
//   - favicon: the favicon of the source
//   - image: the image of the source

//   Use the **content** field of each object in the list to create an informed and helpful
//   response to address the user's question directly.

//   `,
//   parameters: z.object({
//     query: z.string().min(1).max(100).describe("The search query"),
//   }),
//   execute: async ({ query }) => {
//     const response = await exa.searchAndContents(query, {
//       numResults: 5,
//       text: {
//         maxCharacters: 1500,
//       },
//     });
//     return {
//       sources: response.results.map((result) => ({
//         url: result.url,
//         content: result.text,
//         title: result.title,
//         favicon: result.favicon,
//         image: result.image,
//       })),
//     };
//   },
// });
