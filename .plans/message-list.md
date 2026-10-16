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

## Round 2 (Shawn's phone test)

- [x] Chats opened a few hundred points above the bottom, then scrolled
      down. The list used to follow new messages by scrolling to them; an
      update arriving while it opened scrolled it. Now, at the bottom it is
      **pinned**: no scroll anchor, so it stays at offset 0 (the bottom of an
      inverted list) through new messages, a growing composer, and rows that
      change size, with no scrolling at all. Only your own drag or fling
      unpins it, and reaching the bottom pins it again (`useLatest`).
- [x] Rapid replies didn't keep you at the bottom; scrolling away while they
      arrived fought you. Same fix: pinned follows with no scroll, and any
      scroll up unpins at once.
- [x] Scrolling up fast reached the top, and older messages appeared in
      several steps. Older pages load three screens early, render a whole page
      at once (`maxToRenderPerBatch`), and no longer wait for their reactions
      (they load past the edge, where rows that grow move nothing in view).
- [x] Tapbacks redone to match Messages: one round bubble per reaction (two
      ❤️ show two, no counts), the newest at the corner with a thought-bubble
      tail and up to two fanned behind, sitting in space above the bubble.
      They hide while the message is lifted into its menu, so closing it no
      longer flickers them over the lifted copy.
- [x] Reactions that arrive while you watch open their space smoothly
      (`Expand`), for tapbacks and stacked chips; ones already there when a
      row appears are just there.
- [x] iOS jump-to-latest button is a Liquid Glass circle that materializes
      and dissolves.
- [x] Android: the inbox's last row ended under the tab bar.
- Testing a conversation opened in the middle: Settings → your account →
  Developer → Open a Long Thread in the Middle (a 600-message DM, opened 200
  back).

## Round 3

- [x] Tapbacks: no tail dots; 34pt circles with a 1pt ring and more room
      around the emoji. They sit in the bubble's box and rise beside the
      sender's name, moving past it rather than covering it, so a reaction
      never pushes the name up. The gap under the name is a little larger.
- [x] Reaction bar: yours are an inset tinted circle, so two side by side
      never touch; no count badges.
- [x] Who reacted (double tap): a column per emoji with overlapping photos
      and "+N", scrolling sideways, instead of a row per person. Tapping a
      column opens the sheet on that emoji.
- [x] New messages arrive like Messages (`Arrive`): their space opens
      smoothly at the bottom so the conversation glides up, and the message
      floats up into it as it fades in.
- [x] Stacked chips' glass was clipped when it swelled on press (`Expand`
      clipped); the space no longer clips, its contents fade in instead.
- [x] Android: everything vanished scrolling in the long thread. The
      opened-on highlight built an `rgba()` string from a tiny number
      (`5e-16`), which Reanimated on Android throws on, killing the list's
      animations. The tint now fades its opacity. Pages the list asked for
      twice (two `before` cursors) are no longer added twice.
- [x] Newer messages load three screens early too.
- [x] The open fade could shift at the end: the list showed before the
      composer's height was known, then made room. It now waits for it.
- [x] Performance: every row on screen redrew on any list update (824 row
      renders for one send) because `Row` spread its props into a new
      object; and `profileOf` changed each render. Props are passed one by
      one and profiles are shared structurally: about 10 per send now.
- [x] Android inbox: rows draw 1000pt ahead so a fast fling on a slow
      phone doesn't outrun them.

## Round 4: measured, not eyeballed

Measured with a temporary UI-thread frame probe (Reanimated
`useFrameCallback`, logging frames over 24ms) in the iOS simulator, opening
the bot group by route so nothing else touched the device meanwhile.

- [x] Open fade stuttered: after opening, the list kept mounting rows in
      batches (60 at a time, from round 2) for ten screens around the
      bottom, and each batch held the UI thread for 50–80ms, 2–6 times per
      open, right during the fade. Now it renders just the screen until the
      fade finishes (`windowSize` 1, then 11, in batches of 8), and the fade
      starts two frames after the list is placed. After: no slow frames
      during the fade.
- [x] Arriving messages ran at 30fps (a run of 33ms frames per arrival):
      the row's height was animated, which re-lays out the list every
      frame, and the clipping showed an edge they rose from. Now a new
      message is laid out once at full size below the screen (the native
      scroll anchor keeps everything still), then the platform's animated
      scroll slides it into view while it fades in. After: one slow frame
      when the row mounts, before anything moves; none during the slide.
- [x] Bubbles measured themselves and rendered twice to draw the tail as
      one SVG of the whole bubble. The tail is now a fixed SVG over an
      ordinary rounded background: one render, no measuring.
- [x] Reacting from the menu: the reaction now lands once the menu has
      closed, so it animates in where you can see it, and in stacked rows
      the lifted copy no longer covers the message while its row grows.
- [x] Tapbacks fade back in after the menu closes (the fade was a CSS
      transition on a plain Pressable, which doesn't animate).
- [x] Emoji are optically centered in their circles (`Emoji`): Apple's sit
      a little left of the middle of their advance.
- [x] Who reacted: no outline on the photos.
- Known: adding the first reaction still animates the row's height
  (about 35–45ms frames for 0.4s in the simulator). Moving it to native
  frame animations is the next step if it shows on the phone.

## Round 5

- [x] A tapback that would cover the sender's name pushes the name up above
      it, as in Messages; one that clears the name sits beside it.
- [x] A reaction on your bottom message dipped it down and back up: the
      list's anchor was one row off (`ANCHOR` 0; VirtualizedList adds one for
      the header itself), and following the newest message restarted every
      frame while the tapback space opened. It now follows only when the
      newest message or the composer changes, so the bottom message stays put
      and the rest moves up.
- [x] With the keyboard up, holding or double tapping a message no longer
      moves the conversation. The menu is a modal, which takes the keyboard
      down on iOS: the list freezes as it opens, the messages stay over the
      space the keyboard leaves, and closing back to the chat brings the
      keyboard back before the list lets go (`useMenuKeyboard`).
- [x] Performance tooling (`apps/mobile/perf/`, see its README):
  - Render budgets in `pnpm test`: a new message, a reaction, or an older
    page re-renders only the messages it changes.
  - A check that the React Compiler compiles every component and hook. It
    found five it silently skipped, the worst `useMenuKeyboard`, whose
    new object on every render re-rendered every message's reactions and
    press handling on any list update. All five are fixed.
  - Reassure (`pnpm perf`, and a CI report comparing a PR with its base).
    The fixes above: an update to the list takes about half the React work
    it did (78–82ms → 36–38ms per update in Jest, opening 36 → 27ms).
  - Flashlight (Android FPS) isn't in CI: it needs an emulator and a release
    build each run, and emulator frame rates on shared runners are too noisy
    to compare.
