import type { Message } from "@decentralized-convex/messages";
import type { ModelMessage, UserContent } from "ai";

import { LIMIT_NOTICE_START } from "./rateLimits";

// How an assistant's conversation reaches the model (agent.ts): in the
// order it got the messages, with the newest images attached.

/** The newest images the model sees; older ones it only knows were sent. */
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

/**
 * The conversation as the model sees it: the person's messages as user
 * turns, with their newest images attached, and the assistant's own as the
 * `send_message` calls that sent them, so it keeps answering that way.
 */
export function toModelMessages(history: readonly Message[], self: string) {
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
  const images = history
    .filter((message) => message.authorId !== self)
    .flatMap((message) => message.attachments)
    .filter((attachment) => attachment.kind === "image").length;
  let imageCount = 0;
  for (const message of history) {
    if (message.authorId === self && isLimitNotice(message.body)) {
      flush();
      messages.push({
        content: `[Sent automatically, not by you: "${message.body}" They had hit the hourly limit; it has passed now.]`,
        role: "user",
      });
      continue;
    }
    if (message.authorId === self) {
      pendingCalls.push({ body: message.body, id: `m-${message.messageId}` });
      continue;
    }
    flush();
    const lines = [`${sentLabel(message.sentAt)}${message.body}`];
    if (message.quote !== undefined) {
      lines.push(`(replying to: "${message.quote.body.slice(0, 200)}")`);
    }
    const attached: Exclude<UserContent, string> = [];
    for (const attachment of message.attachments) {
      if (attachment.kind !== "image") {
        lines.push(`[${attachment.kind}: ${attachment.name}]`);
        continue;
      }
      imageCount += 1;
      if (images - imageCount < VISIBLE_IMAGES) {
        attached.push({ image: new URL(attachment.url), type: "image" });
      } else {
        lines.push("[an older image, no longer visible]");
      }
    }
    const text = lines.filter(Boolean).join("\n");
    messages.push({
      content: [
        { text: text.length > 0 ? text : "(an image)", type: "text" },
        ...attached,
      ],
      role: "user",
    });
  }
  flush();
  return messages;
}

function isLimitNotice(body: string) {
  return body.startsWith(LIMIT_NOTICE_START);
}

/** When an older message was sent, so the model can weigh dates. */
function sentLabel(sentAt: number) {
  if (Date.now() - sentAt < 6 * 60 * 60 * 1000) return "";
  return `[sent ${new Date(sentAt).toUTCString().slice(0, 16)}] `;
}
