import type { ImageSourcePropType } from "react-native";
import { Host, Icon, Row } from "@expo/ui/jetpack-compose";

/**
 * Loads Material icons ahead of time, drawn invisibly. A header button
 * whose icon first loads after the header is up stays blank (a development
 * build fetches icons from Metro), so a screen that swaps its buttons
 * preloads the ones it shows later. `preload-icons.tsx` is a no-op on iOS.
 */
export function PreloadIcons({
  icons,
}: {
  /** Each icon, by a name to key it with. */
  icons: Readonly<Record<string, ImageSourcePropType>>;
}) {
  return (
    <Host
      matchContents
      pointerEvents="none"
      style={{ opacity: 0, position: "absolute" }}
    >
      <Row>
        {Object.entries(icons).map(([name, icon]) => (
          <Icon key={name} source={icon} size={1} />
        ))}
      </Row>
    </Host>
  );
}
