import type { ReactNode } from "react";
import { createContext, use, useRef, useState } from "react";
import {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";

/** Press-and-hold squeezes the held element a little, as iOS does. */
const PRESS_SCALE = 0.96;
export const LONG_PRESS_MS = 320;
const RELEASE_SPRING = { damping: 14, stiffness: 320 };

/**
 * One squeeze, lent to whatever is held. Its scale is 1 whenever it's
 * free, so a view that takes or gives back its style doesn't change.
 */
type Slot = ReturnType<typeof useSlot>;

/** Who has a slot: told when it's taken from them, and since when. */
interface Loan {
  readonly lose: () => void;
  readonly at: number;
}

/** Squeezes at once: one held, and the last few springing back. */
interface Squeezes {
  readonly take: (lose: () => void) => Slot | undefined;
  readonly give: (slot: Slot) => void;
}

const SqueezeContext = createContext<Squeezes | null>(null);

/** Holds so far (see `useSqueeze`). */
let holds = 0;

/** A new hold's number. */
function nextHold() {
  holds += 1;
  return holds;
}

function useSlot() {
  const scale = useSharedValue(1);
  const style = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));
  return { scale, style };
}

/**
 * The squeezes the messages below lend out as they're held (see
 * `useSqueeze`). Lent, not each message's own: the shared value and
 * animated style a squeeze needs cost every row as it mounts, scrolling
 * or not, and only one is held at a time.
 */
export function SqueezeProvider({ children }: { children: ReactNode }) {
  const slots = [useSlot(), useSlot(), useSlot(), useSlot()];
  // Which are lent, by their place in `slots`.
  const loans = useRef(new Map<number, Loan>());
  function oldestLoan() {
    const lent = [...loans.current].sort(([, a], [, b]) => a.at - b.at);
    return lent[0]?.[0] ?? 0;
  }
  return (
    <SqueezeContext
      value={{
        give: (slot) => {
          loans.current.delete(
            slots.findIndex((each) => each.scale === slot.scale),
          );
        },
        take: (lose) => {
          const free = slots.findIndex((_, index) => !loans.current.has(index));
          const index = free === -1 ? oldestLoan() : free;
          loans.current.get(index)?.lose();
          loans.current.set(index, { at: Date.now(), lose });
          return slots[index];
        },
      }}
    >
      {children}
    </SqueezeContext>
  );
}

/**
 * The squeeze while something is held, as iOS does: it shrinks a little
 * toward the hold's length, and springs back as it lifts or is let go. Put
 * `style` on what squeezes, an animated view: undefined until it's first
 * held, then a squeeze lent by `SqueezeProvider` until it's back at full
 * size. Outside one, nothing squeezes.
 */
export function useSqueeze() {
  const squeezes = use(SqueezeContext);
  const [style, setStyle] = useState<Slot["style"]>();
  // The slot itself for the handlers, which can run before a render, and
  // which hold it is: a spring back from an earlier one ends late.
  const held = useRef<{ slot: Slot; hold: number } | null>(null);
  function lose() {
    held.current = null;
    setStyle(undefined);
  }
  function giveBack(hold: number) {
    if (held.current?.hold !== hold) return;
    squeezes?.give(held.current.slot);
    lose();
  }
  return {
    pressIn: () => {
      const slot = held.current?.slot ?? squeezes?.take(lose);
      if (slot === undefined) return;
      held.current = { hold: nextHold(), slot };
      setStyle(slot.style);
      slot.scale.set(withTiming(PRESS_SCALE, { duration: LONG_PRESS_MS }));
    },
    release: () => {
      if (held.current === null) return;
      const { hold, slot } = held.current;
      slot.scale.set(
        withSpring(1, RELEASE_SPRING, (finished) => {
          if (finished === true) scheduleOnRN(giveBack, hold);
        }),
      );
    },
    style,
  };
}
