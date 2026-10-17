import type { ImageSourcePropType } from "react-native";
import { useColorScheme, View } from "react-native";
import { Image } from "expo-image";
import { Button, FieldGroup, RNHostView } from "@expo/ui";

import { Carousel } from "~/components/carousel";
import { SymbolIcon } from "~/components/symbol-icon";
import { APP_ICONS, useAppIcon } from "~/features/preferences/app-icon";
import { setPreference, usePreference } from "~/features/preferences/store";
import { THEMES } from "~/features/preferences/themes";
import { cn } from "~/lib/cn";
import { choiceButton } from "~/lib/ui-modifiers";

function IconChoice({
  source,
  name,
  selected,
  onPress,
}: {
  source: ImageSourcePropType;
  name: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Button
      variant="text"
      onPress={onPress}
      modifiers={choiceButton(`${name} app icon`, selected)}
    >
      <RNHostView matchContents>
        <View
          className={cn(
            "size-[70px] items-center justify-center rounded-[19px] border-[2.5px]",
            selected ? "border-accent" : "border-transparent",
          )}
        >
          <Image source={source} style={{ height: 58, width: 58 }} />
        </View>
      </RNHostView>
    </Button>
  );
}

function ColorChoice({
  color,
  name,
  selected,
  onPress,
}: {
  color: string;
  name: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Button
      variant="text"
      onPress={onPress}
      modifiers={choiceButton(`${name} color`, selected)}
    >
      <RNHostView matchContents>
        <View
          className="size-9 items-center justify-center rounded-full border-2"
          style={{ borderColor: selected ? color : "transparent" }}
        >
          <View
            className="size-7 items-center justify-center rounded-full"
            style={{ backgroundColor: color }}
          >
            {selected && (
              <SymbolIcon
                name={{ android: "check", ios: "checkmark" }}
                size={13}
                weight="bold"
                tintColor="#ffffff"
              />
            )}
          </View>
        </View>
      </RNHostView>
    </Button>
  );
}

/** Accent colors, previewed in the current color scheme. */
export function ThemesSection() {
  const scheme = useColorScheme() === "dark" ? "dark" : "light";
  const theme = usePreference("theme");
  return (
    <FieldGroup.Section title="Themes">
      <Carousel>
        {THEMES.map((option) => (
          <ColorChoice
            key={option.id}
            color={option[scheme].accent}
            name={option.name}
            selected={theme === option.id}
            onPress={() => setPreference("theme", option.id)}
          />
        ))}
      </Carousel>
    </FieldGroup.Section>
  );
}

/**
 * Home screen icons, previewed in the current color scheme, where the
 * platform and build can switch them. Independent of the color theme.
 */
export function AppIconSection() {
  const scheme = useColorScheme() === "dark" ? "dark" : "light";
  const appIcon = useAppIcon();
  if (!appIcon.available) return null;
  return (
    <FieldGroup.Section title="App Icon">
      <Carousel>
        {APP_ICONS.map((icon) => (
          <IconChoice
            key={icon.id}
            source={icon.preview[scheme]}
            name={icon.name}
            selected={appIcon.current === icon.native}
            onPress={() => appIcon.setIcon(icon)}
          />
        ))}
      </Carousel>
    </FieldGroup.Section>
  );
}
