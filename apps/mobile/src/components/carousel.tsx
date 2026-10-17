import { Platform } from "react-native";
import { Row, ScrollView } from "@expo/ui";
import { Mask, Rectangle } from "@expo/ui/swift-ui";
import { foregroundStyle } from "@expo/ui/swift-ui/modifiers";

import { edgeToEdgeRow } from "~/lib/ui-modifiers";

/** Matches the carousel's edge padding, so the fades never cover a choice at rest. */
const EDGE = 16;

/**
 * Alpha stops for a mask that fades the outer ~1/23 of each side. SwiftUI
 * spaces gradient colors evenly, so the fade width comes from the count.
 */
const EDGE_MASK = [
  "#00000000",
  ...Array.from({ length: 22 }, () => "#000000"),
  "#00000000",
];

/**
 * Fades a carousel out at its edges, where choices scroll out of the card.
 * The fades (about 16pt on a phone) are no wider than the carousel's
 * padding, so at rest they only cover empty space.
 */
function FadedEdges({ children }: { children: React.ReactNode }) {
  if (Platform.OS !== "ios") return children;
  return (
    <Mask>
      {children}
      <Mask.Content>
        <Rectangle
          modifiers={[
            foregroundStyle({
              colors: EDGE_MASK,
              endPoint: { x: 1, y: 0.5 },
              startPoint: { x: 0, y: 0.5 },
              type: "linearGradient",
            }),
          ]}
        />
      </Mask.Content>
    </Mask>
  );
}

/** A row of choices that scrolls sideways when they don't fit. */
export function Carousel({ children }: { children: React.ReactNode }) {
  return (
    <FadedEdges>
      <ScrollView
        direction="horizontal"
        showsIndicators={false}
        style={{ paddingHorizontal: EDGE }}
        modifiers={edgeToEdgeRow}
      >
        <Row spacing={4}>{children}</Row>
      </ScrollView>
    </FadedEdges>
  );
}
