import {
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import type { MentionCandidate } from "./mention-text";
import { Avatar } from "~/components/avatar";
import { GlassSurface } from "~/components/glass-surface";
import { usernameOf } from "~/features/messaging/profiles";

const ROW = 52;
/** Four and a half rows, so a longer list shows it scrolls. */
const MAX_HEIGHT = ROW * 4.5;
/** iOS draws it in glass, which brings its own edge and depth. */
const GLASS = Platform.OS === "ios";

function PersonRow({
  person,
  onPick,
}: {
  person: MentionCandidate;
  onPick: (person: MentionCandidate) => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Mention ${person.displayName}`}
      onPress={() => onPick(person)}
      className="active:bg-fill flex-row items-center gap-3 px-3"
      style={{ height: ROW }}
    >
      <Avatar name={person.displayName} size="row" uri={person.avatarUrl} />
      <View className="flex-1 flex-row items-baseline gap-2">
        <Text
          numberOfLines={1}
          className="text-body text-foreground shrink font-semibold"
        >
          {person.displayName}
        </Text>
        <Text numberOfLines={1} className="text-subhead text-muted shrink-[2]">
          {usernameOf(person.accountId)}
        </Text>
      </View>
    </Pressable>
  );
}

/**
 * The people an `@` can mention, over the message field while a name is
 * typed: photo, name, and username. Tapping one puts them in the message.
 * Glass on iOS, a raised card on Android. Like the keyboard's own
 * suggestions it comes and goes at once, with no animation, and the
 * keyboard stays up while it's tapped.
 */
export function MentionPicker({
  people,
  inset,
  onPick,
}: {
  people: readonly MentionCandidate[];
  /** Space from the screen's sides, lining it up with the field. */
  inset: number;
  onPick: (person: MentionCandidate) => void;
}) {
  return (
    <View
      className="mb-1.5 rounded-[20px]"
      style={{
        boxShadow: GLASS ? undefined : "0 4px 16px rgba(0, 0, 0, 0.12)",
        marginHorizontal: inset,
      }}
    >
      <GlassSurface
        className="overflow-hidden rounded-[20px]"
        androidClassName="bg-background border-separator"
        style={GLASS ? undefined : { borderWidth: StyleSheet.hairlineWidth }}
      >
        <FlatList
          data={people}
          keyExtractor={(person) => person.accountId}
          getItemLayout={(_, index) => ({
            index,
            length: ROW,
            offset: ROW * index,
          })}
          renderItem={({ item }) => <PersonRow person={item} onPick={onPick} />}
          keyboardShouldPersistTaps="always"
          style={{ maxHeight: MAX_HEIGHT }}
          accessibilityLabel="People to mention"
        />
      </GlassSurface>
    </View>
  );
}
