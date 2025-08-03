"use node";

import { generateText } from "ai";
import { internalAction } from "@/convex/_generated/server";
import { resend } from "@/convex/resend";
import { internal } from "../_generated/api";
import { generateResponse } from "../agents/agent_helpers";
import { languageModels } from "../agents/models";
import {
  emailSubjectGeneratorPrompt,
  emailSummaryGeneratorPrompt,
  emailTitleGeneratorPrompt,
} from "../agents/prompts";
import getNewsletterHtml from "./newsletter";

export const sendNewsletter = internalAction({
  handler: async (ctx) => {
    // get the top 10 most clicked suggestions from today
    const suggestions = await ctx.runQuery(
      internal.agents.prompts.prompt_queries.getTodaysSuggestions,
      { numResults: 5 },
    );
    // generate responses for the top 10 prompts
    const promptsAndResponses = await Promise.all(
      suggestions.map(async (suggestion) => ({
        prompt: suggestion.prompt,
        response: await generateResponse(
          ctx,
          suggestion.prompt,
          "Suggestion Response",
        ),
      })),
    );
    // concatenate the top 3 prompts and responses
    const topThreeConcat = promptsAndResponses
      .slice(0, 3)
      .map((response, index) => {
        return `${index + 1}. ${suggestions[index].prompt}\n${response.response}`;
      })
      .join("\n");
    // generate the subject, title, summary, and body of the message
    const [{ text: subject }, { text: title }, { text: summary }] =
      await Promise.all([
        generateText({
          model: languageModels["gemini-2.0-flash"].model,
          system: emailSubjectGeneratorPrompt,
          prompt:
            promptsAndResponses[0].prompt +
            "\n" +
            promptsAndResponses[0].response,
        }),
        generateText({
          model: languageModels["gemini-2.0-flash"].model,
          system: emailTitleGeneratorPrompt,
          prompt: topThreeConcat,
        }),
        generateText({
          model: languageModels["gemini-2.0-flash"].model,
          system: emailSummaryGeneratorPrompt,
          prompt: topThreeConcat,
        }),
      ]);
    const cleanSubject = subject.replace(/[\r\n]+/g, " ").trim();
    const cleanTitle = title.replace(/[\r\n]+/g, " ").trim();
    const html = await getNewsletterHtml({
      cleanTitle,
      summary,
      suggestions,
      promptsAndResponses,
    });
    // get email addresses of all newsletter recipients
    const recipients = await ctx.runQuery(
      internal.user.user_queries.getNewsletterRecipients,
    );
    // send message to each recipient
    const siteUrl = "https://qbe.sh";
    const endpoint = "mail";
    const resubscribe = "resubscribe@qbe.sh";
    const unsubscribe = "unsubscribe@qbe.sh";
    await Promise.all(
      recipients.map(async (recipient) => {
        const url = `${siteUrl}/${endpoint}?email=${encodeURIComponent(recipient)}`;
        await resend.sendEmail(ctx, {
          from: "QBE <newsletter@mail.qbe.sh>",
          to: recipient,
          subject: `📰 ${cleanSubject}`,
          headers: [
            {
              name: "List-Unsubscribe-Post",
              value: "List-Unsubscribe=One-Click",
            },
            {
              name: "List-Unsubscribe",
              value: `<mailto:${unsubscribe}>, <${url}&status=false>`,
            },
            {
              name: "List-Resubscribe",
              value: `<mailto:${resubscribe}>, <${url}&status=true>`,
            },
          ],
          html,
        });
      }),
    );
  },
});
