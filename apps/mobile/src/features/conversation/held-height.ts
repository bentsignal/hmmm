import type { SharedValue } from "react-native-reanimated";
import { useState } from "react";
import {
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";

/**
 * Frames after a change that React is given the height: once the rows
 * have stopped moving (`GROW_MS`), as a commit of React's while they move
 * draws them, for a frame, where they were a few frames before.
 */
const HAND_OVER_FRAMES = 45;

/**
 * A view's height from `height` on the UI thread, held in React too.
 *
 * React's own props for an animated view are the styles it rendered with.
 * Reanimated draws the animated value over them, and copies it back into
 * React only when the JavaScript thread checks in time; it forgets values
 * older than two seconds whether it copied them or not. When that thread
 * is busy (several messages arriving at once), the view's next render puts
 * the height it was first drawn with back: a space for who's typing or for
 * reactions that's open when it should be closed, or closed when it should
 * be open, and the whole thread off by as much until it changes again.
 * Giving React each height too keeps its props current.
 */
export function useHeldHeight(height: SharedValue<number>) {
  const [held, setHeld] = useState(() => height.get());
  // Each change's number, so only the latest is handed over.
  const change = useSharedValue(0);
  useAnimatedReaction(
    () => height.get(),
    (now, before) => {
      if (now === before) return;
      change.set(change.get() + 1);
      const mine = change.get();
      // Once the move it starts has landed, well inside the two seconds:
      // handed over in the same frame, its render had React committing as
      // the change went to the screen, and Reanimated, which waits while
      // React commits, sent the moves on ahead of the height, and the rows
      // jumped (see `IN_COMMIT`).
      let frames = 0;
      function handOver() {
        if (change.get() !== mine) return;
        frames += 1;
        if (frames < HAND_OVER_FRAMES) {
          requestAnimationFrame(handOver);
          return;
        }
        scheduleOnRN(setHeld, now);
      }
      requestAnimationFrame(handOver);
    },
  );
  // eslint-disable-next-line vera/no-layout-animation -- Not animated: the height changes once, in the same frame as the moves, which do the moving.
  const style = useAnimatedStyle(() => ({ height: height.get() }));
  return [{ height: held }, style];
}
