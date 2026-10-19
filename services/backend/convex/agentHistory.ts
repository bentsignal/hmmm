import type { Message } from "@decentralized-convex/messages";
import type { ModelMessage } from "ai";
import { convexGateway } from "@convex-dev/ai-sdk-provider";
import { generateText } from "ai";
import { v } from "convex/values";

import type { ActionCtx } from "./_generated/server";
import { internal } from "./_generated/api";
import { internalMutation, internalQuery } from "./_generated/server";
import { VISION_MODEL } from "./agentTools";

// How an assistant's conversation reaches the model (agent.ts): in the
// order it got the messages, with images described in words.

/** The newest images described for it; older ones it sees only by reference. */
const VISIBLE_IMAGES = 4;

/**
 * The person's messages that arrived after the last reply started are
 * moved after that reply, which is when the assistant got them; otherwise
 * they'd look answered already.
 */
export function inAnswerOrder(
  history: readonly Message[],
  self: string,
  answeredThrough: number,
) {
  function unseen(message: Message) {
    return message.authorId !== self && message.sentAt > answeredThrough;
  }
  return [
    ...history.filter((message) => !unseen(message)),
    ...history.filter(unseen),
  ];
}

/** Each image the person sent, oldest first. */
export function imageUrls(history: readonly Message[], self: string) {
  return history.flatMap((message) =>
    message.authorId === self
      ? []
      : message.attachments
          .filter((attachment) => attachment.kind === "image")
          .map((attachment) => attachment.url),
  );
}

/**
 * The conversation as the model sees it: the person's messages as user
 * turns, with what their images show, and the assistant's own as the
 * `send_message` calls that sent them, so it keeps answering that way.
 */
export function toModelMessages(
  history: readonly Message[],
  self: string,
  descriptions: ReadonlyMap<string, string>,
) {
  const messages: ModelMessage[] = [];
  let pendingCalls: { body: string; id: string }[] = [];
  function flush() {
    if (pendingCalls.length === 0) return;
    messages.push(
      {
        content: pendingCalls.map(({ body, id }) => ({
          input: { text: body },
          toolCallId: id,
          toolName: "send_message",
          type: "tool-call" as const,
        })),
        role: "assistant",
      },
      {
        content: pendingCalls.map(({ id }) => ({
          output: { type: "text" as const, value: "Sent." },
          toolCallId: id,
          toolName: "send_message",
          type: "tool-result" as const,
        })),
        role: "tool",
      },
    );
    pendingCalls = [];
  }
  let imageCount = 0;
  for (const message of history) {
    if (message.authorId === self) {
      pendingCalls.push({ body: message.body, id: `m-${message.messageId}` });
      continue;
    }
    flush();
    const lines = [`${sentLabel(message.sentAt)}${message.body}`];
    if (message.quote !== undefined) {
      lines.push(`(replying to: "${message.quote.body.slice(0, 200)}")`);
    }
    for (const attachment of message.attachments) {
      if (attachment.kind !== "image") {
        lines.push(`[${attachment.kind}: ${attachment.name}]`);
        continue;
      }
      imageCount += 1;
      const description =
        descriptions.get(attachment.url) ?? "an image, too old to look at";
      lines.push(`[image ${String(imageCount)}: ${description}]`);
    }
    const text = lines.filter(Boolean).join("\n");
    messages.push({
      content: text.length > 0 ? text : "(empty)",
      role: "user",
    });
  }
  flush();
  return messages;
}

/** When an older message was sent, so the model can weigh dates. */
function sentLabel(sentAt: number) {
  if (Date.now() - sentAt < 6 * 60 * 60 * 1000) return "";
  return `[sent ${new Date(sentAt).toUTCString().slice(0, 16)}] `;
}

const DESCRIBE_PROMPT = `Describe this image for an assistant who can't see it. Include any text in it word for word when it matters. If it's a screenshot of an app, describe it closely enough that a developer could picture it without the image: which screen it is, what's on it and where, and anything that looks wrong or broken (overlapping or cut-off elements, wrong rotation, errors, blank areas). Then, on its own line, say whether it shows personal information that isn't crossed out or blurred (people's names, message text, faces, phone numbers, addresses), as "Personal information visible: yes" or "Personal information visible: no".`;

/**
 * What the newest images show, described once each by the vision model and
 * kept, plus any older ones already described.
 */
export async function describeImages(ctx: ActionCtx, urls: readonly string[]) {
  const known: { text: string; url: string }[] = await ctx.runQuery(
    internal.agentHistory.descriptions,
    { urls: [...urls] },
  );
  const descriptions = new Map(known.map(({ text, url }) => [url, text]));
  const missing = urls
    .filter((url) => !descriptions.has(url))
    .slice(-VISIBLE_IMAGES);
  await Promise.all(
    missing.map(async (url) => {
      try {
        const { text } = await generateText({
          messages: [
            {
              content: [
                { text: DESCRIBE_PROMPT, type: "text" },
                { image: new URL(url), type: "image" },
              ],
              role: "user",
            },
          ],
          model: convexGateway(VISION_MODEL, { zdr: true }),
        });
        descriptions.set(url, text.trim());
        await ctx.runMutation(internal.agentHistory.saveDescription, {
          text: text.trim(),
          url,
        });
      } catch (error) {
        console.error("Couldn't describe an image", error);
        descriptions.set(url, "an image that couldn't be opened");
      }
    }),
  );
  return descriptions;
}

export const descriptions = internalQuery({
  args: { urls: v.array(v.string()) },
  handler: async (ctx, { urls }) => {
    const rows = await Promise.all(
      urls.map((url) =>
        ctx.db
          .query("imageDescriptions")
          .withIndex("by_url", (q) => q.eq("url", url))
          .first(),
      ),
    );
    return rows
      .filter((row) => row !== null)
      .map(({ text, url }) => ({ text, url }));
  },
});

export const saveDescription = internalMutation({
  args: { text: v.string(), url: v.string() },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("imageDescriptions")
      .withIndex("by_url", (q) => q.eq("url", args.url))
      .first();
    if (existing === null) await ctx.db.insert("imageDescriptions", args);
  },
});
