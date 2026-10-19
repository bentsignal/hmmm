import { Text, View } from "react-native";
import Animated from "react-native-reanimated";

import { GlassSurface } from "~/components/glass-surface";
import { usePending } from "~/components/pending";
import { useAccount, useVisibleAccounts } from "~/features/messaging/account";
import { cn } from "~/lib/cn";
import { useShowsOffline } from "./unanswered";
import { useAnswerDeadline } from "./use-saved-fallback";

/** The pill's height. */
const PILL = 28;

/** Whether Home says it can't connect: any account it shows. */
export function useHomeOffline() {
  return useShowsOffline(useVisibleAccounts().map(({ address }) => address));
}

/** Whether a screen of the current account says it can't connect. */
export function useAccountOffline() {
  return useShowsOffline([useAccount().address]);
}

/**
 * `usePending` for a screen of the current account, whose header has an
 * `OfflinePill`. Still loading at the deadline, it counts the account's
 * PDS as not answering, so the pill says so.
 */
export function useAccountPending(loading: boolean) {
  const { address } = useAccount();
  useAnswerDeadline(address, loading);
  return usePending(loading, useAccountOffline());
}

/**
 * A glass pill, centered `top` points down, saying the PDS isn't
 * answering (`useShowsOffline`), so what's on screen isn't mistaken for
 * live. It floats over a conversation's messages, which already pass under
 * its glass header; a list makes room for it instead (`ScreenList`'s
 * `offline`), so it doesn't cover the top row. On iOS the glass
 * materializes and dissolves (glass can't fade; see `GlassSurface`).
 */
export function OfflinePill({ shown, top }: { shown: boolean; top: number }) {
  return (
    <View
      pointerEvents="none"
      accessibilityElementsHidden={!shown}
      importantForAccessibility={shown ? "auto" : "no-hide-descendants"}
      className="absolute right-0 left-0 items-center"
      style={{ top }}
    >
      <GlassSurface
        shown={shown}
        className="justify-center rounded-full px-3.5"
        androidClassName={cn(
          "bg-background-elevated border-hairline border-separator shadow-sm",
          !shown && "opacity-0",
        )}
        style={{ height: PILL }}
      >
        <Animated.View
          style={{
            opacity: shown ? 1 : 0,
            transitionDuration: 200,
            transitionProperty: "opacity",
          }}
        >
          <Text
            accessibilityLiveRegion="polite"
            className="text-footnote text-foreground font-semibold"
          >
            Can't connect
            <Text className="text-muted font-normal"> · Retrying…</Text>
          </Text>
        </Animated.View>
      </GlassSurface>
    </View>
  );
}
