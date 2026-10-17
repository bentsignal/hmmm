import type { ModifierConfig } from "@expo/ui/jetpack-compose/modifiers";
import type { ReactNode } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LazyColumn, useMaterialColors } from "@expo/ui/jetpack-compose";
import { background, fillMaxSize } from "@expo/ui/jetpack-compose/modifiers";

/**
 * Android `FieldList`: the same spacing and surface as `FieldGroup`, with
 * each section component rendered as its own item. See `field-list.tsx`.
 */
export function FieldList({
  modifiers,
  clearsNavigationBar = false,
  clearsStatusBar = false,
  children,
}: {
  modifiers?: ModifierConfig[];
  /**
   * Keeps the end of the list clear of the system's bottom bar, which
   * screens outside the tabs draw under.
   */
  clearsNavigationBar?: boolean;
  /**
   * Keeps the start of the list clear of the status bar, on a screen
   * without a header.
   */
  clearsStatusBar?: boolean;
  children: ReactNode;
}) {
  const colors = useMaterialColors();
  const insets = useSafeAreaInsets();
  const bottom = 16 + (clearsNavigationBar ? insets.bottom : 0);
  const top = 16 + (clearsStatusBar ? insets.top : 0);
  return (
    <LazyColumn
      verticalArrangement={{ spacedBy: 24 }}
      contentPadding={{ bottom, end: 16, start: 16, top }}
      modifiers={[
        fillMaxSize(),
        background(colors.surface),
        ...(modifiers ?? []),
      ]}
    >
      {children}
    </LazyColumn>
  );
}
