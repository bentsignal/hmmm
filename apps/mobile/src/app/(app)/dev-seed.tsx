import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { Redirect, useLocalSearchParams } from "expo-router";

import { useDevTools } from "~/features/dev/dev-tools";

/**
 * Dev PDS only: `vera:///dev-seed` gives the signed-in account the bot DMs,
 * group, and space, then opens the Inbox, so scripts can set up a simulator
 * without tapping through the account screen. `vera:///dev-seed?full=1`
 * gives it as many full conversations as the app saves on the device.
 */
export default function DevSeedLink() {
  const devTools = useDevTools();
  const { full } = useLocalSearchParams<{ full?: string }>();
  const [done, setDone] = useState(!devTools.enabled);
  const started = useRef(false);
  // eslint-disable-next-line no-restricted-syntax -- Opening the link is the seed request; it runs once on arrival.
  useEffect(() => {
    if (!devTools.enabled || started.current) return;
    started.current = true;
    void (full === undefined ? devTools.seed() : devTools.seedFull()).finally(
      () => setDone(true),
    );
  }, [devTools, full]);
  if (done) return <Redirect href="/" />;
  return (
    <View className="bg-background flex-1 items-center justify-center gap-3">
      <ActivityIndicator />
      <Text className="text-subhead text-muted">
        Seeding bot conversations…
      </Text>
    </View>
  );
}
