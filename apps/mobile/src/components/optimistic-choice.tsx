import { useState } from "react";
import { Row, Spacer, Text } from "@expo/ui";

import type { Choice } from "./choice-menu";
import { fillRow } from "~/lib/ui-modifiers";
import { ChoiceMenu } from "./choice-menu";

/**
 * A server setting with a few named values: a label, and the value in a
 * menu at the row's end. Like `OptimisticSwitch`, it shows the choice
 * right away, follows the server again once the server's value changes,
 * and goes back to it if saving fails.
 */
export function OptimisticChoice<T extends string>({
  label,
  value,
  choices,
  onChange,
}: {
  label: string;
  value: T;
  choices: readonly Choice<T>[];
  onChange: (value: T) => Promise<unknown>;
}) {
  // The choice, and the server's value when it was made.
  const [pending, setPending] = useState<{ choice: T; from: T } | null>(null);
  // The server has moved since the choice: it has the say again.
  if (pending !== null && value !== pending.from) setPending(null);
  const shown = pending === null ? value : pending.choice;
  return (
    <Row alignment="center" modifiers={fillRow}>
      <Text>{label}</Text>
      <Spacer flexible />
      <ChoiceMenu<T>
        value={shown}
        choices={choices}
        onChange={(next) => {
          setPending({ choice: next, from: value });
          onChange(next).catch(() => setPending(null));
        }}
      />
    </Row>
  );
}
