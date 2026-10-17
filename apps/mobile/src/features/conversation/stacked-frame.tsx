import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";

import type { StackedStyle } from "./stacked-style";
import { useStackedStyle } from "./stacked-style";

// The space around stacked rows, in the development styles (see
// `STACKED_STYLES`).

/** The photo column's width. */
export function avatarColumn(style: StackedStyle) {
  return style.bigAvatar ? 40 : 36;
}

/** The row's padding at either side. */
export function rowInset(style: StackedStyle) {
  return style.card ? 12 : 16;
}

/** A sender's run on a faint card, rounded at its ends. */
function CardFrame({
  opens,
  closes,
  style,
  children,
}: {
  opens: boolean;
  closes: boolean;
  style: StackedStyle;
  children: ReactNode;
}) {
  const top = opens ? 16 : 0;
  const bottom = closes ? 16 : 0;
  return (
    <View className="mx-2" style={{ paddingTop: opens ? style.groupGap : 0 }}>
      <View
        className="bg-fill/50"
        style={{
          borderBottomLeftRadius: bottom,
          borderBottomRightRadius: bottom,
          borderTopLeftRadius: top,
          borderTopRightRadius: top,
          paddingBottom: closes ? 10 : 0,
          paddingTop: opens ? 10 : style.messageGap,
        }}
      >
        {children}
      </View>
    </View>
  );
}

/**
 * The space around a row: a gap above a sender's first message (or a
 * reply) and a smaller one between their messages, with a hairline in the
 * gap or a card around the run when the style draws them.
 */
export function GroupFrame({
  opens,
  closes,
  quoteAbove,
  children,
}: {
  /** The first row of a sender's run. */
  opens: boolean;
  /** The last row of a sender's run. */
  closes: boolean;
  /** A reply's quote line sits above the row, using some of the gap. */
  quoteAbove: boolean;
  children: ReactNode;
}) {
  const style = useStackedStyle();
  if (style.card) {
    return (
      <CardFrame opens={opens} closes={closes} style={style}>
        {children}
      </CardFrame>
    );
  }
  const gap = opens ? style.groupGap - (quoteAbove ? 4 : 0) : style.messageGap;
  if (style.divider && opens) {
    return (
      <View>
        <View style={{ paddingTop: gap / 2 }}>
          <View
            className="bg-separator mx-4"
            style={{ height: StyleSheet.hairlineWidth }}
          />
        </View>
        <View style={{ paddingTop: gap / 2 }}>{children}</View>
      </View>
    );
  }
  return <View style={{ paddingTop: gap }}>{children}</View>;
}
