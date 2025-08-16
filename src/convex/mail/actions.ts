"use node";

import { generateText } from "ai";
import { internalAction } from "@/convex/_generated/server";
import { resend } from "@/convex/resend";
import { internal } from "../_generated/api";
import { generateResponse } from "../ai/agents";
import { languageModels } from "../ai/models";
import {
  emailSubjectGeneratorPrompt,
  emailSummaryGeneratorPrompt,
  emailTitleGeneratorPrompt,
} from "../ai/prompts";
import getNewsletterHtml from "./templates";

// the number of stories to include in the newsletter
const STORY_COUNT = 5;

// the number of stories that will be fed back in to generate title
const MAX_FOR_SUMMARY = 3;

export const sendNewsletter = internalAction({
  handler: async (ctx) => {
    console.log("Sending newsletter");
    // get the top 10 most clicked suggestions from today
    const suggestions = await ctx.runQuery(
      internal.ai.suggestions.getTodaysSuggestions,
      { numResults: STORY_COUNT },
    );
    console.log(`Retrieved ${suggestions.length} suggestions`);
    // generate responses for the top 10 prompts
    const withFullResponses = await Promise.all(
      suggestions.map(async (suggestion) => ({
        prompt: suggestion.prompt,
        response: await generateResponse(
          ctx,
          suggestion.prompt,
          "Suggestion Response",
        ),
      })),
    );
    console.log(
      `Generated ${withFullResponses.length} full responses via agent`,
    );
    // summarize the responses from those 10 prompts into 2 sentence bits
    const previews = await Promise.all(
      withFullResponses.map(async (response) => {
        const { text } = await generateText({
          model: languageModels["gemini-2.0-flash"].model,
          system: emailSummaryGeneratorPrompt,
          prompt: response.response,
        });
        return {
          prompt: response.prompt,
          response: text,
        };
      }),
    );
    if (previews.length < 1) {
      console.log("No previews were generated, aborting");
      return;
    }
    const useForSummary = Math.min(MAX_FOR_SUMMARY, previews.length);
    console.log(
      `Generated ${previews.length} previews, using ${useForSummary} for summary`,
    );
    // concatenate the top 3 prompts and responses
    const topThreeConcat = previews
      .slice(0, useForSummary)
      .map((response, index) => {
        return `${index + 1}. ${suggestions[index].prompt}\n${response.response}`;
      })
      .join("\n");
    // generate the subject, title, summary, and body of the message
    const [{ text: subject }, { text: title }] = await Promise.all([
      generateText({
        model: languageModels["gemini-2.0-flash"].model,
        system: emailSubjectGeneratorPrompt,
        prompt: previews[0].prompt + "\n" + previews[0].response,
      }),
      generateText({
        model: languageModels["gemini-2.0-flash"].model,
        system: emailTitleGeneratorPrompt,
        prompt: topThreeConcat,
      }),
    ]);
    const cleanSubject = subject.replace(/[\r\n]+/g, " ").trim();
    const cleanTitle = title.replace(/[\r\n]+/g, " ").trim();
    const recipients = await ctx.runQuery(
      internal.user.account.getNewsletterRecipients,
    );
    console.log(`Sending newsletter to ${recipients.length} recipients`);
    // send message to each recipient
    const siteUrl = "https://qbe.sh";
    const endpoint = "mail";
    const resubscribe = "resubscribe@qbe.sh";
    const unsubscribe = "unsubscribe@qbe.sh";
    await Promise.all(
      recipients.map(async (recipient) => {
        const url = `${siteUrl}/${endpoint}?userId=${encodeURIComponent(recipient.userId)}`;
        const html = await getNewsletterHtml({
          title: cleanTitle,
          stories: previews,
          userId: recipient.userId,
        });
        await resend.sendEmail(ctx, {
          from: "QBE <newsletter@mail.qbe.sh>",
          to: recipient.email,
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
