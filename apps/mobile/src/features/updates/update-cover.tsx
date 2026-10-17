import {
  ActivityIndicator,
  Linking,
  Modal,
  Platform,
  Pressable,
  Text,
  View,
} from "react-native";

import { useRequiredUpdate } from "./app-updates";

/** Where to get a new binary when no over-the-air update can fix this one. */
const STORE_URL =
  Platform.OS === "ios"
    ? // Opens Vera in TestFlight, where every tester gets builds today.
      "itms-beta://beta.itunes.apple.com/v1/app/6818656155"
    : "https://play.google.com/store/apps/details?id=chat.vera.app";

/**
 * Covers the app while a breaking backend change waits for this app's
 * update: the old code can't talk to the new backend, so a spinner beats
 * screens that fail. It stays until the app restarts into the update.
 */
export function UpdateCover() {
  const required = useRequiredUpdate();
  if (required === undefined) return null;
  return (
    <Modal
      visible
      animationType="fade"
      presentationStyle="overFullScreen"
      statusBarTranslucent
    >
      <View className="bg-background flex-1 items-center justify-center gap-3 px-8">
        {required === "updating" ? (
          <>
            <ActivityIndicator />
            <Text className="text-title3 text-foreground font-semibold">
              Updating Vera…
            </Text>
          </>
        ) : (
          <>
            <Text className="text-title3 text-foreground text-center font-semibold">
              Vera needs an update
            </Text>
            <Text className="text-subhead text-muted text-center">
              This version is too old to update itself. Get the latest one to
              keep going.
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => void Linking.openURL(STORE_URL)}
            >
              <Text className="text-body text-accent font-semibold">
                {Platform.OS === "ios" ? "Open TestFlight" : "Open Play Store"}
              </Text>
            </Pressable>
          </>
        )}
      </View>
    </Modal>
  );
}
