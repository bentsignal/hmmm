import Animated from "react-native-reanimated";

import type { ReplyCard } from "./reply-card";
import type { Message } from "./types";
import { topReacted } from "./bubble-top";
import { usePieceLift } from "./grow";
import { QUOTE_GAP, QuoteBubble, ReplyCurve } from "./reply-card";
import { useRowOrder } from "./row-order";
import { Place } from "./row-place";
import { TAPBACK_SPACE } from "./tapbacks";

// A reply bubble's quote and the curve down from it, which move up with
// the rows above when the reply makes room for tapbacks (see `Growth`).

/** The space between a reply's quote and its bubble. */
function quoteGap(message: Message) {
  return QUOTE_GAP + (topReacted(message) ? TAPBACK_SPACE : 0);
}

/** The reply's curve, from under its quote down into the bubble. */
export function MovingReplyCurve({
  message,
  isOwn,
}: {
  message: Message;
  isOwn: boolean;
}) {
  const lift = usePieceLift(useRowOrder(message), Place.top);
  return (
    <Animated.View
      pointerEvents="none"
      className="absolute inset-0"
      style={lift}
    >
      <ReplyCurve isOwn={isOwn} above={quoteGap(message)} />
    </Animated.View>
  );
}

/** The reply's quote of the message it answers, above the bubble. */
export function MovingQuote({
  message,
  card,
}: {
  message: Message;
  card: ReplyCard;
}) {
  const lift = usePieceLift(useRowOrder(message), Place.top);
  return (
    <Animated.View style={[{ marginBottom: QUOTE_GAP }, lift]}>
      <QuoteBubble message={message} card={card} />
    </Animated.View>
  );
}
