"use node";

import { Html, Link } from "@react-email/components";
import { pretty, render } from "@react-email/render";
import { v } from "convex/values";
import { internalAction } from "@/convex/_generated/server";
import { resend } from "@/convex/resend";
import { internal } from "../_generated/api";

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
    const suggestions = await ctx.runQuery(
      internal.agents.prompts.prompt_queries.getTopSuggestions,
    );
    const html = await pretty(
      await render(
        <Html>
          <div className="flex flex-col gap-2">
            {suggestions.map((suggestion) => {
              const prompt = suggestion.prompt.replace(/ /g, "+");
              return (
                <Link
                  href={`https://qbe.sh/new?q=${prompt}`}
                  key={suggestion.id}
                >
                  - {suggestion.prompt}
                </Link>
              );
            })}
          </div>
        </Html>,
      ),
    );
    const user = {
      email: args.to,
      userId: "userId_2019slDKfjsdlifj09jsdf0asij",
    };
    const siteUrl = process.env.CONVEX_SITE_URL;
    if (!siteUrl) {
      throw new Error("CONVEX_SITE_URL is not set");
    }
    const url = `https://qbe.sh/mail?email=${user.email}`;
    const resubscribe = "resubscribe@qbe.sh";
    const unsubscribe = "unsubscribe@qbe.sh";
    await resend.sendEmail(ctx, {
      from: "QBE <newsletter@mail.qbe.sh>",
      to: args.to,
      subject: "More news! 📰",
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
