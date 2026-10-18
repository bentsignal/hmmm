import { Button, Text, useMaterialColors } from "@expo/ui/jetpack-compose";

import { fillWidth, plainRow } from "~/lib/ui-modifiers";
import { LABEL_STYLE } from "./prominent-button-style";

/**
 * Android `DestructiveButton`: a filled button in the theme's soft error
 * colors. See `destructive-button.tsx`.
 */
export function DestructiveButton({
  label,
  onPress,
}: {
  label: string;
  onPress: () => void;
}) {
  const colors = useMaterialColors();
  return (
    <Button
      colors={{
        containerColor: colors.errorContainer,
        contentColor: colors.onErrorContainer,
      }}
      modifiers={plainRow}
      onClick={onPress}
    >
      <Text modifiers={fillWidth} style={LABEL_STYLE}>
        {label}
      </Text>
    </Button>
  );
}
