import { createContext, use } from "react";

import { rowOrder } from "./orders";

/** The order of the list row this is in (see `Orders`). */
export const RowOrderContext = createContext<number | undefined>(undefined);

/**
 * The order of the row `message` is in, for the pieces of it that move
 * with the rows (see `usePieceLift`): the row's own, so they always match
 * it. Outside a list row (the menu's copy of a message), its natural one.
 */
export function useRowOrder(message: { readonly sentAt: Date }) {
  return use(RowOrderContext) ?? rowOrder(message.sentAt);
}
