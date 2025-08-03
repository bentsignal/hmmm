"use node";

import { mailStyles } from "@/styles";
import {
  Heading,
  Html,
  Link,
  Markdown,
  Section,
  Text,
} from "@react-email/components";
import { pretty, render } from "@react-email/render";
import { generateText } from "ai";
import { v } from "convex/values";
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
import { Button } from "@/components/mail";

export const sendWelcomeEmail = internalAction({
  args: {
    to: v.string(),
  },
  handler: async (ctx, args) => {
    await resend.sendEmail(ctx, {
      from: "QBE <welcome@qbe.sh>",
      to: args.to,
      subject: "Welcome. How can I help you today?",
      html: "This is a test email",
    });
  },
});

export const sendNewsletter = internalAction({
  args: {
    to: v.string(),
  },
  handler: async (ctx, args) => {
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
    // generate the subject, title, and summary for the email
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
    const html = await pretty(
      await render(
        <Html>
          <Section
            style={{
              display: "flex",
              flexDirection: "column",
              gap: mailStyles.spacing2xl,
              maxWidth: mailStyles.containerXl,
              margin: "0 auto",
            }}
          >
            <Heading as="h2">{cleanTitle}</Heading>
            <Markdown>{summary}</Markdown>
            <Section
              style={{
                display: "flex",
                flexDirection: "column",
                gap: mailStyles.spacingMd,
              }}
            >
              {suggestions.map((suggestion, index) => {
                const prompt = suggestion.prompt.replace(/ /g, "+");
                return (
                  <Section
                    key={suggestion.id}
                    style={{
                      border: "1px solid #e0e0e0",
                      borderRadius: mailStyles.radiusLg,
                      paddingTop: mailStyles.spacingMd,
                      paddingBottom: mailStyles.spacingMd,
                      paddingLeft: mailStyles.spacingLg,
                      paddingRight: mailStyles.spacingLg,
                      marginBottom: mailStyles.spacingMd,
                    }}
                  >
                    <Link
                      href={`https://qbe.sh/new?q=${prompt}`}
                      key={suggestion.id}
                      style={{
                        textDecoration: "none",
                      }}
                    >
                      <Heading as="h3">{suggestion.prompt}</Heading>
                      <Markdown>
                        {promptsAndResponses[index].response.slice(0, 300)}
                      </Markdown>
                      <Text>
                        {promptsAndResponses[index].response.length > 300
                          ? "..."
                          : ""}
                      </Text>
                      <Section
                        style={{
                          display: "flex",
                          justifyContent: "center",
                          alignItems: "center",
                          marginTop: mailStyles.spacingMd,
                        }}
                      >
                        <Button href="https://qbe.sh/settings/general">
                          Read More
                        </Button>
                      </Section>
                    </Link>
                  </Section>
                );
              })}
            </Section>
            <Section
              style={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <Button href="https://qbe.sh/settings/general">
                Update your preferences
              </Button>
            </Section>
          </Section>
        </Html>,
      ),
    );
    const user = {
      email: args.to,
      userId: "userId_2019slDKfjsdlifj09jsdf0asij",
    };
    const siteUrl = "https://qbe.sh";
    const endpoint = "mail";
    const url = `${siteUrl}/${endpoint}?email=${encodeURIComponent(user.email)}`;
    const resubscribe = "resubscribe@qbe.sh";
    const unsubscribe = "unsubscribe@qbe.sh";
    await resend.sendEmail(ctx, {
      from: "QBE <newsletter@mail.qbe.sh>",
      to: args.to,
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
  },
});
