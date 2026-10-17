import { directConversationId } from "@decentralized-convex/messages";

/**
 * A direct conversation's ID names its two members, so who it's with is
 * known before it loads, and their names and photos can load alongside it.
 */
export function directConversation(conversationId: string) {
  const [prefix, left, right, ...rest] = conversationId.split(":");
  if (
    prefix !== "direct" ||
    left === undefined ||
    right === undefined ||
    rest.length > 0 ||
    directConversationId(left, right) !== conversationId
  ) {
    return undefined;
  }
  return {
    kind: "direct" as const,
    members: [left, right],
    name: null,
  };
}
