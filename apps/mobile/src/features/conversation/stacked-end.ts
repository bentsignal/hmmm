import type { Message } from "./types";
import { attachmentPart } from "~/features/messaging/reactions";
import { linkCardsOf, visibleBody } from "./message-text";

/**
 * The part whose chips go under the whole message, under its thread's
 * count: the last one, unless link cards under the text come after it.
 */
export function lastPart(message: Message) {
  const attachments = message.attachments.length;
  if (linkCardsOf(message).length > 0) {
    return visibleBody(message) !== undefined ? null : "message";
  }
  return attachments > 0 ? attachmentPart(message, attachments - 1) : "message";
}
