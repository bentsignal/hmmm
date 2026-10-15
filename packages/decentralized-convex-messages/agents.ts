// Who previews are fetched as. Sites let different link expanders through,
// so a page is tried as each of `PAGE_AGENTS` in turn.

/**
 * The link expanders iMessage's user agent names, still naming Vera. Reddit
 * sends anything but the crawlers it knows an empty page.
 */
export const LINK_PREVIEW_USER_AGENT =
  "Mozilla/5.0 (compatible; VeraBot/1.0; +https://vera.chat) facebookexternalhit/1.1 Facebot Twitterbot/1.0";

const WHATSAPP = "WhatsApp/2.23.20.0";

/**
 * Who a page is fetched as, in turn, until one gets its Open Graph tags.
 * Cloudflare blocks a "facebookexternalhit" that isn't Facebook's (AP
 * News) but lets WhatsApp's and Slack's through, as the Washington Post
 * does; Reuters only lets Discord's in. The last is a browser, for sites
 * that serve browsers their tags and bots nothing.
 */
export const PAGE_AGENTS = [
  LINK_PREVIEW_USER_AGENT,
  WHATSAPP,
  "Slackbot-LinkExpanding 1.0 (+https://api.slack.com/robots)",
  "Mozilla/5.0 (compatible; Discordbot/2.0; +https://discordapp.com)",
  "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1",
];

/**
 * Who apps load a preview's image as. Image CDNs that check where a
 * crawler comes from (CNN's, CNBC's, the Washington Post's) block a
 * Facebook one that isn't Facebook's but let WhatsApp's through, and
 * Reddit only draws its real post image for link expanders.
 */
export const PREVIEW_IMAGE_USER_AGENT = WHATSAPP;
