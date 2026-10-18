import { Button, Text } from "@expo/ui";
import {
  buttonBorderShape,
  buttonStyle,
  controlSize,
  tint,
} from "@expo/ui/swift-ui/modifiers";

import { fillWidth, plainRow } from "~/lib/ui-modifiers";
import { LABEL_STYLE } from "./prominent-button-style";

/**
 * A full-width, large button drawn on the page of a `FieldGroup`, shaped
 * like a `ProminentButton`, for an action that can't be taken back: red
 * text on a pale red fill, softer than a solid red one.
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
      modifiers={[
        buttonStyle("bordered"),
        buttonBorderShape("capsule"),
        controlSize("large"),
        tint("red"),
        ...plainRow,
      ]}
      onPress={onPress}
    >
      <Text modifiers={fillWidth} textStyle={LABEL_STYLE}>
        {label}
      </Text>
    </Button>
  );
}
