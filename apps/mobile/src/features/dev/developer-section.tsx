import { useState } from "react";
import { Alert } from "react-native";
import { useRouter } from "expo-router";
import { Button, FieldGroup, Text } from "@expo/ui";

import type { ServerDelay } from "./server-delay";
import { useAccount } from "~/features/messaging/account";
import { useDevTools } from "./dev-tools";
import { SERVER_DELAYS, setServerDelay, useServerDelay } from "./server-delay";

const DELAY_LABELS = {
  never: "Never",
  off: "Right Away",
  slow: "After 3 Seconds",
} satisfies Record<ServerDelay, string>;

/** Account screen section for the dev PDS. Hidden in preview and store builds. */
export function DeveloperSection() {
  const devTools = useDevTools();
  const router = useRouter();
  const { address } = useAccount();
  const [seeding, setSeeding] = useState(false);
  const delay = useServerDelay();
  if (!devTools.enabled) return null;

  async function seed(full = false) {
    setSeeding(true);
    const failed = await (full ? devTools.seedFull() : devTools.seed()).then(
      () => false,
      () => true,
    );
    setSeeding(false);
    Alert.alert(
      failed ? "Seeding Failed" : "Seeded",
      failed
        ? "Check the dev deployment logs."
        : full
          ? "Bots filled DMs, 8 groups, and the Storage Lab space."
          : "Bots added DMs, a group, and the Bot Lounge space.",
    );
  }

  async function openLongThread() {
    const target = await devTools.longThreadMiddle().catch(() => null);
    if (target?.messageId == null) {
      Alert.alert("Couldn't Open", "Seed bot conversations first.");
      return;
    }
    router.push({
      params: {
        account: address,
        conversationId: target.conversationId,
        messageId: target.messageId,
      },
      pathname: "/conversation/[conversationId]",
    });
  }

  return (
    <FieldGroup.Section title="Developer">
      <Button
        label={seeding ? "Seeding…" : "Seed Bot Conversations"}
        variant="text"
        disabled={seeding}
        onPress={() => void seed()}
      />
      <Button
        label={seeding ? "Seeding…" : "Seed 20 Full Conversations"}
        variant="text"
        disabled={seeding}
        onPress={() => void seed(true)}
      />
      <Button
        label="Open a Long Thread in the Middle"
        variant="text"
        onPress={() => void openLongThread()}
      />
      <Button
        label={`Server Answers: ${DELAY_LABELS[delay]}`}
        variant="text"
        onPress={() =>
          setServerDelay(
            SERVER_DELAYS[
              (SERVER_DELAYS.indexOf(delay) + 1) % SERVER_DELAYS.length
            ] ?? "off",
          )
        }
      />
      <FieldGroup.SectionFooter>
        <Text>
          Bots reply to messages you send in their conversations. The long
          thread opens 200 messages back, like an old notification, to test
          loading older and newer messages.
        </Text>
      </FieldGroup.SectionFooter>
    </FieldGroup.Section>
  );
}
