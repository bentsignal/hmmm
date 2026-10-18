import { ActivityIndicator, View } from "react-native";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import { FieldGroup, Text } from "@expo/ui";

import { Avatar } from "~/components/avatar";
import { ListItem } from "~/components/list-item";
import { SymbolIcon } from "~/components/symbol-icon";
import { secondaryTextStyle } from "~/lib/colors";

/**
 * The account's photo, name, and address. Tapping it changes the photo,
 * which the camera badge on the photo says. While a new photo uploads, it
 * dims under a spinner, and both fade away when it's done.
 */
export function ProfileSection({
  displayName,
  address,
  avatarUrl,
  uploading,
  onChangePhoto,
}: {
  displayName: string;
  address: string;
  avatarUrl: string | null;
  uploading: boolean;
  onChangePhoto: () => void;
}) {
  return (
    <FieldGroup.Section>
      <ListItem
        leading={
          <View accessibilityHint="Changes your photo" className="size-20">
            <Avatar name={displayName} size="lg" uri={avatarUrl} />
            {uploading && (
              <Animated.View
                entering={FadeIn.duration(220)}
                exiting={FadeOut.duration(220)}
                accessibilityLabel="Uploading photo"
                className="absolute inset-0 items-center justify-center rounded-full bg-black/40"
              >
                <ActivityIndicator color="#ffffff" />
              </Animated.View>
            )}
            <View className="border-background-elevated bg-accent absolute right-0 bottom-0 size-7 items-center justify-center rounded-full border-2">
              <SymbolIcon
                name={{ android: "photo_camera", ios: "camera.fill" }}
                size={13}
                tintColor="#ffffff"
              />
            </View>
          </View>
        }
        supportingText={<Text textStyle={secondaryTextStyle}>{address}</Text>}
        onPress={onChangePhoto}
      >
        <Text textStyle={{ fontSize: 22, fontWeight: "600" }}>
          {displayName}
        </Text>
      </ListItem>
    </FieldGroup.Section>
  );
}
