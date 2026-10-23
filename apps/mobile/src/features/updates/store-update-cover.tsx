import { Linking, Modal, Pressable, Text, View } from "react-native";

import { useNeedsNativeListBinary } from "~/features/native-list/switch";
import { STORE_LABEL, STORE_URL } from "./store-link";

/**
 * Covers the app when it needs a new store build, not an over-the-air
 * update: the native message list is on and this binary has none (see
 * `NATIVE_LIST.requireBinary`). The store-build twin of `UpdateCover`.
 */
export function StoreUpdateCover() {
  if (!useNeedsNativeListBinary()) return null;
  return (
    <Modal
      visible
      animationType="fade"
      presentationStyle="overFullScreen"
      statusBarTranslucent
    >
      <View className="bg-background flex-1 items-center justify-center gap-3 px-8">
        <Text className="text-title3 text-foreground text-center font-semibold">
          Update Vera
        </Text>
        <Pressable
          accessibilityRole="button"
          onPress={() => void Linking.openURL(STORE_URL)}
        >
          <Text className="text-body text-accent font-semibold">
            {STORE_LABEL}
          </Text>
        </Pressable>
      </View>
    </Modal>
  );
}
