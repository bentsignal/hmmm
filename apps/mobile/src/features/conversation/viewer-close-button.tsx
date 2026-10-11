import { Button } from "@expo/ui/swift-ui";
import {
  buttonBorderShape,
  buttonStyle,
  controlSize,
  foregroundStyle,
  labelStyle,
} from "@expo/ui/swift-ui/modifiers";

import { NativeHost } from "~/components/native-host";

/**
 * The full-screen viewers' close button: a glass circle with an xmark, as
 * a native SwiftUI button. `viewer-close-button.android.tsx` is a Material
 * icon button.
 */
export function ViewerCloseButton({ onPress }: { onPress: () => void }) {
  return (
    // Dark, since it's always drawn over the viewer's black backdrop.
    <NativeHost matchContents ignoreSafeArea="all" colorScheme="dark">
      <Button
        role="close"
        label="Close"
        systemImage="xmark"
        onPress={onPress}
        modifiers={[
          labelStyle("iconOnly"),
          buttonStyle("glass"),
          buttonBorderShape("circle"),
          controlSize("large"),
          // White like Photos', not the app's accent.
          foregroundStyle("white"),
        ]}
      />
    </NativeHost>
  );
}
