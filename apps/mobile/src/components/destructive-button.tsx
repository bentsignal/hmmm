import { Button, Text } from "@expo/ui";
import { tint } from "@expo/ui/swift-ui/modifiers";

import { fillWidth, plainRow, prominentButton } from "~/lib/ui-modifiers";
import { LABEL_STYLE } from "./prominent-button-style";

/** The system red, faint enough that the glass shows through pale. */
const PALE_RED = "#FF3B3033";
/** The label: a softer red than the system one. */
const LABEL_RED = "#D9483F";

/**
 * A full-width, large glass button drawn on the page of a `FieldGroup`,
 * like a `ProminentButton`, for an action that can't be taken back: red
 * text on pale red glass rather than a solid red fill.
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
      modifiers={[...prominentButton, tint(PALE_RED), ...plainRow]}
      onPress={onPress}
    >
      <Text
        modifiers={fillWidth}
        textStyle={{ ...LABEL_STYLE, color: LABEL_RED }}
      >
        {label}
      </Text>
    </Button>
  );
}
