import Close from "@expo/material-symbols/close.xml";
import { Icon, IconButton } from "@expo/ui/jetpack-compose";

import { NativeHost } from "~/components/native-host";

/**
 * Android `ViewerCloseButton`: a Material icon button on a dark circle.
 * See `viewer-close-button.tsx`.
 */
export function ViewerCloseButton({ onPress }: { onPress: () => void }) {
  return (
    <NativeHost matchContents colorScheme="dark">
      <IconButton
        onClick={onPress}
        colors={{
          containerColor: "rgba(0, 0, 0, 0.5)",
          contentColor: "white",
        }}
      >
        <Icon source={Close} size={24} contentDescription="Close" />
      </IconButton>
    </NativeHost>
  );
}
