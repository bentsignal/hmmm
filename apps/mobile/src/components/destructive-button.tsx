import { Button, Text } from "@expo/ui";
import { tint } from "@expo/ui/swift-ui/modifiers";

import { fillWidth, plainRow, prominentButton } from "~/lib/ui-modifiers";
import { LABEL_STYLE } from "./prominent-button-style";

/**
 * A full-width, large red button drawn on the page of a `FieldGroup`, like
 * a `ProminentButton` for an action that can't be taken back.
 */
export function DestructiveButton({
  label,
  onPress,
}: {
  label: string;
  onPress: () => void;
}) {
  return (
    <Button
      variant="filled"
      modifiers={[...prominentButton, tint("red"), ...plainRow]}
      onPress={onPress}
    >
      <Text modifiers={fillWidth} textStyle={LABEL_STYLE}>
        {label}
      </Text>
    </Button>
  );
}
