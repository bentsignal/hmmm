import type { ReactNode } from "react";
import type { SharedValue } from "react-native-reanimated";
import { useState } from "react";
import { Platform, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";

import type { ProfileOf } from "./message-row";
import type { Newest, TypingSeen } from "./typing-change";
import type { MessageLayout } from "~/features/preferences/store";
import { useLiftAll, useUnderNewestLift } from "./grow";
import { typingChange } from "./typing-change";
import { Indicator, useOnMount } from "./typing-parts";
import { typingSpaceHeight } from "./typing-space";

// Who's typing, under the newest message. The list keeps a space for it
// while anyone types (see `typing-space.ts`): it opens as the first person
// starts and closes as the last one stops, and people starting and
// stopping in between change it in place.

/** As long as the list takes to slide it into view, or back out. */
const APPEAR_MS = 280;
const LEAVE_MS = 280;
/** Crossfading into the message it became, as that fades in. */
const BECOME_MS = 220;
const ANDROID = Platform.OS === "android";

/** Bubbles grow from and shrink to where incoming ones are anchored. */
function originOf(layout: MessageLayout) {
  return layout === "stacked" ? "left center" : "left bottom";
}

/** Fades and grows in from its corner as it mounts. */
function Appearing({
  layout,
  children,
}: {
  layout: MessageLayout;
  children: ReactNode;
}) {
  const shown = useSharedValue(0);
  useOnMount(() => {
    "worklet";
    shown.set(
      withTiming(1, { duration: APPEAR_MS, easing: Easing.out(Easing.cubic) }),
    );
  });
  const style = useAnimatedStyle(() => ({
    opacity: shown.get(),
    transform: [{ scale: 0.75 + 0.25 * shown.get() }],
  }));
  return (
    <Animated.View style={[{ transformOrigin: originOf(layout) }, style]}>
      {children}
    </Animated.View>
  );
}

/** An indicator that ended, showing as it goes (see `typingChange`). */
interface Ghost {
  key: string;
  typists: readonly string[];
  became: boolean;
}

/**
 * What was showing, after it ended: shrinking back into its corner and
 * fading as the space closes, or fading under the message it became.
 */
function Leaving({
  became,
  layout,
  onDone,
  children,
}: {
  became: boolean;
  layout: MessageLayout;
  onDone: () => void;
  children: ReactNode;
}) {
  const shown = useSharedValue(1);
  useOnMount(() => {
    "worklet";
    shown.set(
      withTiming(
        0,
        {
          duration: became ? BECOME_MS : LEAVE_MS,
          easing: Easing.out(Easing.cubic),
        },
        (finished) => {
          if (finished === true) scheduleOnRN(onDone);
        },
      ),
    );
  });
  const style = useAnimatedStyle(() => ({
    opacity: shown.get(),
    transform: [{ scale: became ? 1 : 0.75 + 0.25 * shown.get() }],
  }));
  return (
    <Animated.View
      pointerEvents="none"
      className="absolute inset-x-0"
      style={[
        // Where it was: under the message that took its place, which is
        // just above the space, or in the space as it closes.
        became ? { bottom: "100%" } : { top: 0 },
        { transformOrigin: originOf(layout) },
        style,
      ]}
    >
      {children}
    </Animated.View>
  );
}

/**
 * The space itself. It changes at once, in the same frame as the rest of
 * the list's change, and the list keeps what's on screen still through it
 * and then slides (see `useLatest`). Android's list can't keep it still as
 * the space closes at the bottom (it doesn't scroll past the end), so
 * there everything is drawn where it was and eases down, in the frame the
 * space closes.
 */
function Space({
  height,
  ease,
  fromBottom,
  children,
}: {
  height: number;
  /** Closing alone, with no message to take its place. */
  ease: boolean;
  fromBottom: SharedValue<number>;
  children: ReactNode;
}) {
  const space = useSharedValue(height);
  const liftAll = useLiftAll();
  useAnimatedReaction(
    () => height,
    (now) => {
      const delta = now - space.get();
      if (delta === 0) return;
      space.set(now);
      if (!ANDROID || !ease || delta > 0) return;
      // What the list's scroll above the bottom couldn't take up.
      const dropped = -delta - Math.max(0, fromBottom.get());
      if (dropped > 0) liftAll(-dropped);
    },
    [height, ease],
  );
  // eslint-disable-next-line vera/no-layout-animation -- Not animated: the height changes once, in the same frame as the lift, which does the moving.
  const style = useAnimatedStyle(() => ({ height: space.get() }));
  return <Animated.View style={style}>{children}</Animated.View>;
}

/**
 * The space under the newest message while anyone types, with the
 * indicator in it. The first typist opens it and the list slides it into
 * view, as it does a new message; when the last one stops, it shrinks away
 * as the list slides back down. When their message comes with the stop,
 * the message takes its place, and the indicator fades under it as it
 * fades in; anyone still typing then shows again under that.
 */
export function TypingSpace({
  typists,
  layout,
  profileOf,
  showFaces,
  newest,
  fromBottom,
}: {
  /** Who's typing, in the order they started. */
  typists: readonly string[];
  layout: MessageLayout;
  profileOf: ProfileOf;
  /** Photos beside the bubble: in groups, as beside their messages. */
  showFaces: boolean;
  /** The newest row, to tell when a message came with the stop. */
  newest: Newest | undefined;
  /** How far the list is scrolled up from the newest message. */
  fromBottom: SharedValue<number>;
}) {
  const [seen, setSeen] = useState<TypingSeen>({
    arrived: false,
    newestKey: newest?.key,
    typists,
  });
  const [ghosts, setGhosts] = useState<readonly Ghost[]>([]);
  // A new space mounts with its height in the same commit as the message
  // that came with it; changing the height later takes a frame more, and
  // the list would see the two changes apart.
  const [spaceKey, setSpaceKey] = useState(0);
  // Bumped to show the indicator again, as it first appeared.
  const [appearKey, setAppearKey] = useState(0);
  const change = typingChange(seen, newest, typists);
  if (change !== undefined) {
    const { left } = change;
    setSeen(change.seen);
    // The same change again so soon replaces the one still going.
    const others = ghosts.filter((ghost) => ghost.key !== left?.key);
    if (left !== undefined) setGhosts([...others, left]);
    if (change.reopened) setSpaceKey(spaceKey + 1);
    if (change.reappeared) setAppearKey(appearKey + 1);
  }
  const typing = typists.length > 0;
  const lift = useUnderNewestLift();
  function people(accounts: readonly string[]) {
    return accounts.map((address) => ({ address, ...profileOf(address) }));
  }
  return (
    <View>
      <Space
        key={spaceKey}
        height={typingSpaceHeight(layout, typing)}
        ease={!seen.arrived}
        fromBottom={fromBottom}
      >
        {typing && (
          <Appearing key={appearKey} layout={layout}>
            <Indicator
              people={people(typists)}
              layout={layout}
              showFaces={showFaces}
            />
          </Appearing>
        )}
      </Space>
      <Animated.View
        pointerEvents="none"
        className="absolute inset-x-0 top-0"
        style={lift}
      >
        {ghosts.map((ghost) => (
          <Leaving
            key={ghost.key}
            became={ghost.became}
            layout={layout}
            onDone={() =>
              setGhosts((all) => all.filter((each) => each !== ghost))
            }
          >
            <Indicator
              people={people(ghost.typists)}
              layout={layout}
              showFaces={showFaces}
            />
          </Leaving>
        ))}
      </Animated.View>
    </View>
  );
}

type BelowNewestProps = Parameters<typeof TypingSpace>[0] & {
  composerHeight: number;
};

/**
 * Everything under the newest message: who's typing, then room for the
 * composer floating over the bottom of the list.
 */
export function BelowNewest({ composerHeight, ...typing }: BelowNewestProps) {
  return (
    <View>
      <TypingSpace {...typing} />
      <View style={{ height: composerHeight + 8 }} />
    </View>
  );
}
