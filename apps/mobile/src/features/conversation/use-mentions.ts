import type { Mention } from "@decentralized-convex/messages";
import type {
  NativeSyntheticEvent,
  TextInputSelectionChangeEventData,
} from "react-native";
import { useState } from "react";

import type { MentionCandidate } from "./mention-text";
import { readDraft, saveDraftMentions } from "./drafts";
import {
  deleteWholeMention,
  insertMention,
  isPicked,
  keptMentions,
  mentionQuery,
  suggestions,
} from "./mention-text";

interface Selection {
  readonly end: number;
  readonly start: number;
}

/**
 * The message field's @mentions: who's been picked, the people the
 * `@name` being typed at the cursor could be, and picking one. Nobody can
 * be mentioned where `mentionable` is undefined (direct messages). Who's
 * been picked is kept with the draft (`draftKey`).
 */
export function useMentions(
  draft: string,
  mentionable: readonly MentionCandidate[] | undefined,
  draftKey: string,
) {
  const [mentions, setPicked] = useState<readonly Mention[]>(
    () => readDraft(draftKey).mentions,
  );
  function setMentions(next: readonly Mention[]) {
    setPicked(next);
    saveDraftMentions(draftKey, next);
  }
  const [selection, setSelection] = useState<Selection>({ end: 0, start: 0 });
  // Where the cursor goes after the text is changed here, until the field
  // reports it's there.
  const [placed, setPlaced] = useState<Selection>();
  const query =
    mentionable === undefined || selection.start !== selection.end
      ? null
      : mentionQuery(draft, selection.start);

  function place(cursor: number) {
    setPlaced({ end: cursor, start: cursor });
    setSelection({ end: cursor, start: cursor });
  }

  return {
    /** Who the `@name` being typed could be; empty when none is. */
    people:
      query === null ||
      mentionable === undefined ||
      isPicked(query.query, mentions)
        ? []
        : suggestions(mentionable, query.query),
    /** For the field: where its cursor is, and putting it back. */
    inputProps: {
      onSelectionChange: (
        event: NativeSyntheticEvent<TextInputSelectionChangeEventData>,
      ) => {
        setSelection(event.nativeEvent.selection);
        setPlaced(undefined);
      },
      selection: placed,
    },
    /** The text after an edit: deleting into a mention deletes all of it. */
    edited: (text: string) => {
      const whole = deleteWholeMention(draft, text, mentions);
      const next = whole?.text ?? text;
      if (whole !== null) place(whole.cursor);
      setMentions(keptMentions(next, mentions));
      return next;
    },
    /** The text with `person` in place of the `@name` being typed. */
    pick: (person: MentionCandidate) => {
      if (query === null) return null;
      const name = person.displayName.trim();
      const inserted = insertMention(draft, query.start, selection.start, name);
      setMentions([...mentions, { accountId: person.accountId, name }]);
      place(inserted.cursor);
      return inserted.text;
    },
    /** Who the sent text mentions, starting over for the next message. */
    take: (text: string) => {
      setMentions([]);
      return keptMentions(text, mentions);
    },
  };
}
