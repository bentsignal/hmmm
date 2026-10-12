import type { EdgeInsets } from "react-native-safe-area-context";
import { createContext } from "react";

/**
 * Fixed insets for the `ScreenList`s inside, in place of the ones iOS
 * works out from the bars. Inside a horizontal pager iOS works those out
 * late, so the last row sits under the tab bar until a second scroll.
 */
export const ScreenListInsets = createContext<EdgeInsets | null>(null);
