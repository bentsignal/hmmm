/**
 * When a link in a message's text last took a tap (one tap lands at a
 * time), which then isn't the message's.
 */
let linkTappedAt = 0;

/** How long a link's tap keeps the message's tap from opening its thread. */
const LINK_TAP_MS = 600;

/**
 * Tells the message around it that a link took the tap, so the tap
 * doesn't also open the message's thread.
 */
export function linkTapped() {
  linkTappedAt = Date.now();
}

/** Whether a link just took the tap the message is seeing. */
export function wasLinkTap() {
  return Date.now() - linkTappedAt < LINK_TAP_MS;
}
