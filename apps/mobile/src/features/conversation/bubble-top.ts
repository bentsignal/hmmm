import type { Message } from "./types";
import { attachmentPart, reactionsOn } from "~/features/messaging/reactions";

/** A bubble's top part: its first attachment, or its text. */
export function bubbleTopPart(message: Message) {
  return message.attachments.length > 0
    ? attachmentPart(message, 0)
    : "message";
}

/** Whether a bubble's top part has tapbacks, which rise above it. */
export function topReacted(message: Message) {
  return reactionsOn(message.reactions, bubbleTopPart(message)).length > 0;
}
