import type { ViewToken } from "react-native";
import { useState } from "react";

import type { ListRow } from "./typing-row";
import { useGrowth } from "./grow";
import { onScreenRange } from "./screen-range";

/** A row counts as on screen with any of it showing. */
const VIEWABILITY = { itemVisiblePercentThreshold: 1 };

/**
 * Tells the rows which of them are on screen, from the list's own
 * viewability (see `Growth.onScreen`). FlatList takes these props once.
 */
export function useOnScreenRows() {
  const { onScreen } = useGrowth();
  const [onViewableItemsChanged] = useState(
    () =>
      ({ viewableItems }: { viewableItems: ViewToken<ListRow>[] }) => {
        const orders = viewableItems.flatMap(({ item }) =>
          item.type === "typing" ? [] : [item.order],
        );
        if (orders.length === 0) return;
        onScreen.set(onScreenRange(Math.min(...orders), Math.max(...orders)));
      },
  );
  return { onViewableItemsChanged, viewabilityConfig: VIEWABILITY };
}
