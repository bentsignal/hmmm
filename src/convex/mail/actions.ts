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

// the number of stories that will be fed back in to generate the title
// of the newsletter, which will be used in the subject line
const MAX_FOR_SUBJECT = 3;

// mail config

const ORIGIN =
  process.env.CONVEX_ENV === "development"
    ? "http://localhost:3000"
    : "https://qbe.sh";
const ENDPOINT = "mail";
const RESUBSCRIBE = "resubscribe@qbe.sh";
const UNSUBSCRIBE = "unsubscribe@qbe.sh";
const FROM = "QBE <newsletter@mail.qbe.sh>";

export const sendNewsletter = internalAction({
  handler: async (ctx) => {
    console.log("Starting newsletter generation");
    // get the top 10 most clicked suggestions from the last 7 days
    const suggestions = await ctx.runQuery(
      internal.ai.suggestions.getTopWeekly,
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
    const useForSubject = Math.min(MAX_FOR_SUBJECT, previews.length);
    console.log(
      `Generated ${previews.length} previews, using ${useForSubject} for subject`,
    );
    // concatenate the top 3 prompts and responses
    const topThreeConcat = previews
      .slice(0, useForSubject)
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
      internal.mail.newsletter.getRecipients,
    );
    console.log(`Sending newsletter to ${recipients.length} recipients`);
    // send message to each recipient
    await Promise.all(
      recipients.map(async (recipient) => {
        const url = `${ORIGIN}/${ENDPOINT}?userId=${encodeURIComponent(recipient.userId)}`;
        const html = await getNewsletterHtml({
          title: cleanTitle,
          stories: previews,
          userId: recipient.userId,
          origin: ORIGIN,
        });
        await resend.sendEmail(ctx, {
          from: FROM,
          to: recipient.email,
          subject: `📰 ${cleanSubject}`,
          headers: [
            {
              name: "List-Unsubscribe-Post",
              value: "List-Unsubscribe=One-Click",
            },
            {
              name: "List-Unsubscribe",
              value: `<mailto:${UNSUBSCRIBE}>, <${url}&status=false>`,
            },
            {
              name: "List-Resubscribe",
              value: `<mailto:${RESUBSCRIBE}>, <${url}&status=true>`,
            },
          ],
          html,
        });
      }),
    );
  },
});
