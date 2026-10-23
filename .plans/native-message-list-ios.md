# Native message list on iOS: phone feedback round (2026-10-23 evening)

The iOS side of the round in `native-message-list.md` ("Phone feedback
round"). Shawn ran private preview build 10 on his iPhone. The list is
much faster than the React Native one, and that, the real-content lift,
and reader anchoring all stay as they are. This records what was wrong in
the iOS source, what changed, and what still needs a device. The contract
changes are integration's (revision 3, agreed by both natives). This file
covers only `apps/mobile/modules/message-list/ios/`.

## Causes found in the source

- **Reaction taps waited about 0.3 s.** `tap.require(toFail: doubleTap)`
  made every single tap, reactions included, wait for the double tap to
  fail. Nothing native played a haptic. At 6b264fa2 the module had no
  haptic of any kind.
- **Holding a chip opened the message menu.** `MessageCell.hit(at:hold:)`
  checked reactions only for taps, so a hold fell through to the part
  under the chip.
- **Deck tapbacks were every card's reactions merged.** They were keyed by
  whichever card first had each emoji, so a tap could toggle the wrong
  photo's reaction.
- **DMs showed a typing photo.** The typing row had no way to say it was a
  one-on-one conversation. Because of the faces, the bubble also sat 38
  points right of where the DM's message lands, so the morph jumped
  sideways.
- **The typing to message morph was rough.** `grow` animated the bubble's
  frame with `UIView.animate`. Its tail is placed in `layoutSubviews`,
  which runs after the animation block, so the tail jumped to the end. The
  text faded in a third of the way through, spilling out of the small
  bubble. It also ran for messages React Native doesn't morph (photos,
  quotes, link cards), and those then showed with no rise and no fade.
- **The carousel was clipped at the photo column.** The strip started at
  the text column with `clipsToBounds`, so cards were cut off there. Its
  snapping capped a swipe at one card past the nearest, with
  `decelerationRate = .fast`, which felt like the gesture stopped halfway.
- **The deck threw both ways to the same card** and swapped content when
  the throw ended, so the card vanished after a short flight and its blur
  snapped off.

## What iOS does now

- Reaction touches go to their own tap recognizer, which waits for
  nothing. They play a light impact on touch-up, and the chip or tapback
  shrinks under the finger. A tapped stacked chip is drawn toggled at
  once, through `ReactionToggle` on the row's JSON. That lasts until
  JavaScript's row agrees, or 3 s. Tapbacks aren't previewed, because
  their tap shows who reacted.
- Reaction presses and holds report the exact part, the media item's
  `index`, and that part's frame. A hold adds `element: "reaction"` and
  `reactionKey` (`MessageLayout.target(forPart:)`).
- A deck's tapbacks belong to each card and are drawn on it while it's in
  front.
- `TypingRow.showFaces` is read in both layouts. When it's absent, faces
  show. Without faces, a bubble starts at the padding and a stacked label
  at the text column.
- The morph mirrors `bubble-morph.tsx`. It runs only for a bubbles message
  that's text alone. Over 320 ms on `ease`, the bubble goes from the
  typing bubble's frame to its own, with the tail riding along. The dots
  are gone by a third, then the text fades in over 220 ms. It's all Core
  Animation, and updates to that row wait until it ends.
- The carousel spans the row, with its first card at the text column.
  It uses UIScrollView's normal deceleration and settles on the card
  nearest where the fling would stop, with the last card fully on screen.
  The author's photo shrinks toward its top as the cards pass under it,
  the same curve as Android.
- The deck is a pile: the next card behind on the right, the one before
  on the left, both turned and offset. Swipe left for the next, right for
  the one before. The thrown card goes out with the finger and tucks in
  behind on that side. Each card cross-fades to a pre-blurred copy with
  depth. Android draws the same pile.
- Stacked chips can be drawn three ways. `fill` is the default and the
  control until they're measured. `sheen` is a stretchable image with
  glass's tint, rim and shadow. It samples no backdrop and needs no
  offscreen pass, but its cost hasn't been measured. `glass` is
  `UIGlassEffect`.
  The app's `VeraChipMaterial` default picks one at launch, for the
  comparison.

## Checks

- `Tests/run.sh`: 94 checks. 61 of them are new, for the reaction toggle
  and hits, exact parts, deck tapbacks and the pile, the carousel's bounds
  and settling, the avatar recede, `showFaces`, and morph eligibility.
- Still to do in integration's combined client: the motion check and
  `sim.sh frames`, before and after, for reaction tap and hold, carousel
  and deck swipes both ways, and the hand-off in a DM and a group. Then
  the chip material comparison, then Shawn on his phone.
