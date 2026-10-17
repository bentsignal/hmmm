import type { ReactNode } from "react";
import { Pressable } from "react-native";

import { useOpenProfile } from "~/features/profile/use-open-profile";
import { useMenuPress } from "./row-touch";

/**
 * A sender's photo or name beside their message, opening their profile.
 * Holding it holds the message's row.
 */
export function AuthorLink({
  address,
  name,
  repeated = false,
  children,
}: {
  address: string;
  name: string;
  /** Beside another link to the same profile, which screen readers keep. */
  repeated?: boolean;
  children: ReactNode;
}) {
  const openProfile = useOpenProfile();
  const hold = useMenuPress();
  return (
    <Pressable
      delayLongPress={hold?.delayLongPress}
      onLongPress={hold?.onLongPress}
      accessibilityElementsHidden={repeated}
      importantForAccessibility={repeated ? "no-hide-descendants" : "auto"}
      accessibilityRole="button"
      accessibilityLabel={`${name}, open profile`}
      hitSlop={6}
      onPress={() => openProfile(address)}
      className="active:opacity-60"
    >
      {children}
    </Pressable>
  );
}
