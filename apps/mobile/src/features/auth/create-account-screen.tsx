import { useState } from "react";
import { View } from "react-native";
import { KeyboardStickyView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { FieldGroup, Row, Text } from "@expo/ui";

import { useFormBackground } from "~/components/form-background";
import { NativeHost } from "~/components/native-host";
import { ProminentButton } from "~/components/prominent-button";
import { TextInput } from "~/components/text-input";
import { env } from "~/env";
import { createAccount } from "~/features/session/passkeys";
import { usePendingSignIn } from "~/features/session/pending-sign-in";
import { nativeColors } from "~/lib/colors";
import { fillRow, growInRow } from "~/lib/ui-modifiers";
import { useAuthFlow } from "./auth-flow";
import { isValidUsername, normalizeUsername } from "./username";

export function CreateAccountScreen() {
  const insets = useSafeAreaInsets();
  const background = useFormBackground();
  const pendingSignIn = usePendingSignIn();
  const { attempt, pending } = useAuthFlow();
  const [username, setUsername] = useState("");
  const canSubmit = isValidUsername(normalizeUsername(username));

  return (
    // The form's color behind the button too, so the screen is one color
    // (see `useFormScreenOptions` for the header).
    <View className="flex-1" style={{ backgroundColor: background }}>
      <NativeHost style={{ flex: 1 }}>
        <FieldGroup>
          <FieldGroup.Section title="Address">
            <Row alignment="center" spacing={2} modifiers={fillRow}>
              <TextInput
                modifiers={growInRow}
                placeholder="username"
                autoFocus
                autoCapitalize="none"
                autoCorrect={false}
                onChangeText={setUsername}
              />
              <Text
                textStyle={{ color: nativeColors.secondaryLabel }}
              >{`@${env.veraDomain}`}</Text>
            </Row>
            <FieldGroup.SectionFooter>
              <Text>
                Your address is how people find you. It can't be changed later.
              </Text>
            </FieldGroup.SectionFooter>
          </FieldGroup.Section>
        </FieldGroup>
      </NativeHost>
      <KeyboardStickyView offset={{ opened: insets.bottom }}>
        <View
          className="px-6 pt-3"
          style={{ paddingBottom: insets.bottom + 8 }}
        >
          <ProminentButton
            label="Continue"
            disabled={!canSubmit}
            loading={pending}
            onPress={() =>
              void attempt("Couldn't Create Account", () =>
                createAccount(pendingSignIn, {
                  username: normalizeUsername(username),
                }),
              )
            }
          />
        </View>
      </KeyboardStickyView>
    </View>
  );
}
