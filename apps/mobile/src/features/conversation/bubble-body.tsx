import { useState } from "react";
import { View } from "react-native";
import { useCSSVariable } from "uniwind";

import type { Message } from "./types";
import { cn } from "~/lib/cn";
import { useBecoming } from "./arrive";
import { BubbleBackdrop, GrowingText } from "./bubble-morph";
import { BUBBLE_RADIUS, TAIL_DROP } from "./bubble-shape";
import { LinkedText } from "./linked-text";

/**
 * A message's text in its bubble: a plain rounded background, and the tail
 * drawn over its corner when it ends a run. Nothing is measured, so a
 * bubble renders once. One that takes the typing indicator's place grows
 * out of its bubble (see `BubbleMorph`), and its text fades in.
 */
export function BubbleBody({
  text,
  mentions,
  isOwn,
  tail,
}: {
  text: string;
  mentions: Message["mentions"];
  isOwn: boolean;
  tail: boolean;
}) {
  const outgoing = useCSSVariable("--color-bubble-outgoing");
  const incoming = useCSSVariable("--color-bubble-incoming");
  const color = isOwn ? outgoing : incoming;
  const fill = typeof color === "string" ? color : undefined;
  const becoming = useBecoming();
  const [morphing, setMorphing] = useState(becoming && !isOwn && tail);
  return (
    <View
      className="px-3.5 py-2"
      style={{
        backgroundColor: morphing ? undefined : fill,
        borderCurve: "continuous",
        borderRadius: BUBBLE_RADIUS,
        // Room for the tail hanging below, so nothing under it overlaps.
        marginBottom: tail ? TAIL_DROP : 0,
      }}
    >
      <BubbleBackdrop
        fill={fill}
        isOwn={isOwn}
        tail={tail}
        morphing={morphing}
        onMorphed={() => setMorphing(false)}
      />
      <GrowingText growing={becoming}>
        <LinkedText
          text={text}
          mentions={mentions}
          className={cn(
            "text-body leading-[22px]",
            isOwn ? "text-on-accent" : "text-foreground",
          )}
        />
      </GrowingText>
    </View>
  );
}
