import type { MessageAttachment } from "./types";

/**
 * A stable React key for an attachment: this device's copy when it sent
 * it, which stays the same once the upload finishes and the PDS confirms
 * the message.
 */
export function attachmentKey(attachment: MessageAttachment) {
  return attachment.localUrl ?? attachment.url;
}
