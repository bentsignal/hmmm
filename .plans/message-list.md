# Message list overhaul

Shawn's list of what made conversations feel broken, and what each fix is.

## Scroll and loading jank

- [x] Rows drew over each other and the header while scrolling up, and
      things shifted as a conversation faded in or a page of older messages
      loaded. Legend List places every row at an estimated position, then
      moves it once measured and corrects the scroll offset from JavaScript,
      so on a phone those corrections show. The conversation is now an
      **inverted `FlatList`** inside react-native-keyboard-controller's
      `KeyboardChatScrollView` (`message-list.tsx`):
  - It lays out from the newest message up, so it opens at the bottom
    without scrolling there.
  - Older pages are appended past the top in layout order. Nothing on
    screen moves when they load or are measured, with no scroll correction
    at all.
  - Rows are laid out by Yoga in flow, never at an estimated spot first.
  - Newer messages (and newer pages, in a conversation opened around an
    old message) keep what's on screen in place with the native
    `maintainVisibleContentPosition`. At the bottom, a new message slides
    into view (`autoscrollToTopThreshold`).
- [x] Reactions loaded after their messages, so chips (now tapbacks) popped
      in and pushed rows around after the list showed. A page of messages
      now shows only once its reactions have loaded too
      (`useSettledPages` in `conversations.ts`), including the opening
      pages. A PDS that fails to answer for reactions counts as none.
- [x] Names and photos could swap in after the list showed. The list waits
      for the members' profiles; a profile whose PDS fails counts as none
      instead of holding the screen forever.
- [x] The jump-to-latest button flashed while a conversation opened (the
      list scrolled to the end after showing). An inverted list starts at
      the end, so it never does.

## Sending

- [x] Stacked: the time popped in next to the name once a message sent. It
      is always laid out now, transparent until sent, then fades in.
- [x] Bubbles: no "Delivered" under your newest message. A message is half
      opacity while sending and fades to full once the PDS has it
      (`SendingFade`).
- [x] Messages could stay "sending" forever with no way to retry: a send
      whose request hangs never settled. A send now shows "Not sent. Tap
      to try again." after 20 seconds (`SEND_TIMEOUT_MS` in `outbox.ts`).
      Sends are idempotent by message ID, so a late success and a retry
      agree. A message the PDS took also shows as sent even before the
      conversation's pages list it.
- [x] Sending while iOS offered an autocorrection put the corrected word
      back in the cleared field. The composer drops a whole word landing in
      the empty field within a second of sending (typing adds a letter at a
      time).

## Reactions

- [x] Bubbles: iMessage tapbacks instead of chips under the message. Each
      emoji is a small round bubble stacked over the message's top corner
      (top right of theirs, top left of yours), yours tinted, with a count
      past three emoji or several people. Tapping them shows who reacted.
      Stacked rows keep Slack's chips underneath.
- [x] Double tap a message (either layout) to react and see who reacted,
      iMessage-style: the message lifts with the reaction bar above and a
      glass list of each person's photo, name, and emoji below. Long press
      still opens the actions, including View Reactions (the sheet).
- [x] Photos, videos, and files couldn't be long pressed (their own tap
      took the press), so media-only messages had no menu. They open it
      now, and photos and videos have **Save to Photos**
      (`expo-media-library`, add-only access; a native change).
