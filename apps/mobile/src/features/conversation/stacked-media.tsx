import type { ReactNode } from "react";
import { useState } from "react";
import { View } from "react-native";

import type { CarouselReactionsOf } from "./carousel-parts";
import type { MediaItem } from "./media-groups";
import type { Message } from "./types";
import type { CarouselReactions } from "~/features/preferences/store";
import { usePreference } from "~/features/preferences/store";
import { attachmentKey } from "./attachment-key";
import { AttachmentView } from "./attachment-view";
import {
  CARD_HEIGHT,
  cardOffsets,
  cardWidth,
  CHIP_LINE,
  ChipLane,
  chipsHeight,
  CurrentChips,
  ReactionBadge,
  Strip,
  useCarouselReactions,
} from "./carousel-parts";
import { ReactionPartProvider } from "./message-actions";
import { ChipRow } from "./reaction-chips";
import { Placed } from "./reaction-parts";

function Card({
  message,
  item,
  style,
  reactions,
}: {
  message: Message;
  item: MediaItem;
  style: CarouselReactions;
  reactions: CarouselReactionsOf;
}) {
  const own = reactions.on(item.part);
  return (
    <ReactionPartProvider part={item.part}>
      <View>
        <AttachmentView
          attachment={item.attachment}
          sending={message.status === "sending"}
          size={{ height: CARD_HEIGHT, width: cardWidth(item.attachment) }}
        />
        {style === "badges" && own.length > 0 && (
          <ReactionBadge
            reactions={own}
            onPress={() => reactions.view(item.part)}
          />
        )}
      </View>
    </ReactionPartProvider>
  );
}

/** A card, and its chips under it when they go there (`cards`). */
function CardColumn({
  message,
  item,
  style,
  reactions,
  onChipsHeight,
}: {
  message: Message;
  item: MediaItem;
  style: CarouselReactions;
  reactions: CarouselReactionsOf;
  onChipsHeight: (index: number, height: number) => void;
}) {
  const own = reactions.on(item.part);
  return (
    <View>
      <Card message={message} item={item} style={style} reactions={reactions} />
      {style === "cards" && (
        <View
          style={{ width: cardWidth(item.attachment) }}
          onLayout={(event) =>
            onChipsHeight(item.index, event.nativeEvent.layout.height)
          }
        >
          {own.length > 0 && (
            <ChipRow
              reactions={own}
              align="start"
              onToggle={(emoji) => reactions.toggle(item.part, emoji)}
              onHold={(emoji) => reactions.view(item.part, emoji)}
            />
          )}
        </View>
      )}
    </View>
  );
}

/** The carousel in the lifted copy: laid out as is, without room opening. */
function StillCarousel({
  height,
  offsets,
  chips,
  item,
  reactions,
  children,
}: {
  height: number;
  offsets: readonly number[];
  /** Whether the chips go under the carousel (`current`) and it has some. */
  chips: boolean;
  item: MediaItem | undefined;
  reactions: CarouselReactionsOf;
  children: ReactNode;
}) {
  return (
    <View className="self-stretch">
      <Strip height={height} offsets={offsets}>
        {children}
      </Strip>
      {chips && <CurrentChips item={item} reactions={reactions} />}
    </View>
  );
}

/**
 * How tall the chips under the cards are, the tallest of them: measured
 * once laid out, estimated before (see `chipsHeight`).
 */
function useCardsLane(
  items: readonly MediaItem[],
  reactions: CarouselReactionsOf,
) {
  const [measured, setMeasured] = useState<Record<number, number>>({});
  const height = Math.max(
    0,
    ...items.map(
      (item) =>
        measured[item.index] ??
        chipsHeight(reactions.on(item.part).length, cardWidth(item.attachment)),
    ),
  );
  function onChipsHeight(index: number, chips: number) {
    setMeasured((heights) =>
      heights[index] === chips ? heights : { ...heights, [index]: chips },
    );
  }
  return { height, onChipsHeight };
}

/**
 * A stacked row's photos and videos, two or more, in a carousel across the
 * row: each card as tall as the others, as wide as its photo's shape, and
 * the next one peeking past the edge. A swipe settles on a card. Each card
 * takes its own reactions, shown as `carouselReactions` picks:
 *
 * - `cards`: chips under each card, scrolling with it.
 * - `current`: one row of chips under the carousel, for the card a swipe
 *   settled on.
 * - `badges`: a small glass badge on each card's corner, which shows who
 *   reacted. Holding a card reacts to it.
 *
 * `place` is the first card's place in the message (see `Reactable`).
 */
export function StackedMediaCarousel({
  message,
  items,
  place,
}: {
  message: Message;
  items: readonly MediaItem[];
  place: number;
}) {
  const style = usePreference("carouselReactions");
  const reactions = useCarouselReactions(message);
  const offsets = cardOffsets(items);
  const [current, setCurrent] = useState(0);
  const [natural, setNatural] = useState(CHIP_LINE);
  const lane = useCardsLane(items, reactions);
  const open = items.some((item) => reactions.on(item.part).length > 0);
  const cards = items.map((item) => (
    <CardColumn
      key={attachmentKey(item.attachment)}
      message={message}
      item={item}
      style={style}
      reactions={reactions}
      onChipsHeight={lane.onChipsHeight}
    />
  ));
  // Under each card, the chips scroll with the cards, over room that
  // opens below them.
  const under = style === "cards";
  const cardsLane = under ? lane.height : 0;
  if (reactions.parts === null) {
    return (
      <StillCarousel
        height={CARD_HEIGHT + cardsLane}
        offsets={offsets}
        chips={style === "current" && open}
        item={items[0]}
        reactions={reactions}
      >
        {cards}
      </StillCarousel>
    );
  }
  return (
    <View className="self-stretch">
      <Placed place={place}>
        {under && <View style={{ height: CARD_HEIGHT }} />}
        <Strip
          height={CARD_HEIGHT + cardsLane}
          offsets={offsets}
          absolute={under}
          onCard={style === "current" ? setCurrent : undefined}
        >
          {cards}
        </Strip>
      </Placed>
      {style !== "badges" && (
        <ChipLane
          parts={reactions.parts}
          place={place + 1}
          open={open && (!under || cardsLane > 0)}
          natural={under ? cardsLane : natural}
          absolute={under}
          onMeasured={(height) => setNatural(Math.max(CHIP_LINE, height))}
        >
          <CurrentChips item={items[current]} reactions={reactions} />
        </ChipLane>
      )}
    </View>
  );
}
