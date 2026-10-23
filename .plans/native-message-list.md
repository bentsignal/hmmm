# Native message list

Decided with Shawn on 2026-10-22. The message list is being rebuilt
natively: UICollectionView in Swift on iOS, RecyclerView in Kotlin on
Android. The core is native, and it's extended from JavaScript. This
records why, what's decided, and what's still open. Read it before
working on the message list.

## Why

The React Native list (an inverted FlatList with a Reanimated motion
system, see `message-list-v2.md`) became a glass house. Every small
change risked breaking something else, and on 2026-10-22 an OTA built
from #255 dropped to about 5 FPS when older messages loaded in Shawn's
real group chat. It had been fine in testing. The causes are structural:

1. **The motion depends on timing we don't control.** A layout change
   happens at once and a transform hides it as it eases away, so both
   must reach the screen in the same frame. Reanimated 4.5 on RN 0.86
   holds layout back while React commits but sends transforms straight
   away, so they drift apart whenever React is busy. The trick that used
   to hold them together (`IN_COMMIT`) silently stopped working after an
   upgrade. Fixes became a matter of which frame things land in.
2. **JavaScript sits on the path from data to screen.** Every row is a
   React tree with its own animation setup. A page of older messages
   means JavaScript builds dozens of them, and the main thread then
   mounts hundreds of views in one frame. Media makes it worse. When
   that frame takes 100+ ms instead of 16, you get the 5 FPS.
3. **We tested in conditions too gentle.** A simulator on a fast Mac,
   bots that only send text, and mostly dev builds. Nothing measured a
   production build on a phone with a media-heavy chat before a release.

### Why native fixes this

- **Small, bounded work per frame.** The list asks for one cell just
  before it comes on screen, only for what's visible plus a few ahead,
  on the thread that draws. A page of older messages arriving costs
  data, not a burst of view creation.
- **Cells are recycled.** About 20 cell views are reused, so showing a
  row is "set this text, set this image", not "create 40 views".
- **Heights are known in advance.** They're computed from data (text
  size, image dimensions), off the main thread if needed, and cached.
  Older pages go in above the reader with the scroll offset adjusted in
  the same layout pass, so nothing moves on screen.
- **Animations happen in one transaction.** Batch updates insert rows,
  move the others, and animate them in a single UIKit transaction on
  the main thread, with no second thread to fall out of step with. The
  animations run in the render server, so they stay smooth even when
  the app is briefly busy.
- **JavaScript leaves the critical path.** It sends data and changes.
  A busy JavaScript thread slows how fast data updates, not how
  smoothly the list scrolls.

## Decisions

### Native draws; JavaScript decides what to draw

Native knows how to draw, scroll, and animate. JavaScript decides what to
show, what it means, and what happens when it's touched. Keeping that line
clean means almost every change ships as an OTA update.

- **Native draws everything common:** text bubbles, stacked rows,
  photos, videos, files, link cards, quote and reply cards, reactions
  (tapbacks and chips), lines under a message ("1 reply", "Edited",
  "Not sent"), time headers, notices, and the typing indicator. These
  are on screen all the time and must be fast.
- **Messages are built from blocks.** Native has a small set of
  primitives: text with styled spans (mentions, links, emphasis), media,
  file, link card, quote card, and footer lines. JavaScript maps each
  message onto them. A new message type made from existing blocks needs
  no native build.
- **Reactions are data.** Native draws "a reaction" (its content and
  count) without knowing which reactions exist. Content is an emoji,
  which is just text, or later an image URL for custom emoji. The
  picker and the menus stay in JavaScript. Going from today's 8
  reactions to any emoji, or adding custom ones, ships over the air.
- **Look and words come from JavaScript:** colors, spacing, fonts,
  radii, animation timings, and every label are passed in as values.
- **Behavior is decided in JavaScript.** Native reports events (a
  message tapped or held, a reaction tapped, the list reaching the top
  or bottom, visible range changes). JavaScript acts on them: opening
  threads and menus, toggling reactions, loading pages.

### An escape hatch for what native can't draw yet

A row kind native doesn't support can be rendered by React inside a
native cell. It's slower, which is fine for a rare or experimental row
(a poll, a custom card), and it works until the native version ships in
a store build. Common rows never use it: a list full of these would be
slow again. A row kind moves to native once it becomes common.

### A versioned contract that's safe over the air

- **Version the contract.** The native list tells JavaScript its
  contract version and which blocks and row kinds it supports.
- **Check before sending.** JavaScript only sends what the installed
  binary supports. Anything else uses the escape hatch or a plain
  fallback.
- **Ignore the unknown.** Native ignores fields it doesn't recognize
  and never crashes on them.

An OTA update can therefore never break the list on a phone with an
older build. That phone just draws the new thing more simply until it
updates.

### Shipping it

- **The native list ships behind a switch, and the current list stays
  in the app.** The switch can be flipped over the air, globally and
  per account. If the native list misbehaves, it's flipped back with no
  store build.
- **Shawn tests it first** in the production app, in his real group
  chat: switched on for his account, or in a production build made just
  for him. When he says it's good, it's switched on for everyone over
  the air.
- **One store build introduces it.** The native work is front-loaded
  so it settles fast. Later native changes are batched into occasional
  store builds, so people aren't sent to TestFlight every few days.
  Iteration after that happens over the air in JavaScript.
- **It's switched on only after it beats the current list** on Shawn's
  phone in the same chat, on both the motion check and the device
  performance gate below.

### Guarding against regressions

Shawn wants something that makes regressions in motion and feel hard to
introduce. When the list works it feels as good as iMessage, but with
this many moving pieces it's easy to break. The layers:

1. **The architecture itself.** With motion owned by native and
   JavaScript limited to data, JavaScript changes (the common case)
   can't make the list jank. Only native changes can, so they get the
   heaviest checks.
2. **The motion check** (`scripts/motion/check.sh`). It plays every
   list animation in the simulator, records it, and fails on snaps,
   jump-backs, flickers, and blank frames. It's adapted to the native
   list and required for every native change.
3. **A device performance gate before every release.** A media-heavy
   seeded chat (photos, videos, link cards, reactions, hundreds of
   messages) and a production build on a real phone, measuring FPS
   while flinging up as older pages load and during floods of new
   messages. Releases must pass it. This would have caught the
   2026-10-22 regression.
4. **Native tests** for layout and diffing: heights from data, prepends
   keeping the scroll position, and batch updates matching data diffs.
   Plus contract tests for the JavaScript → native data.
5. **Before/after videos of each native change**, side by side, made
   automatically for Shawn to watch. Some things only a person can
   judge.

## Open questions, to settle before code

- **The data contract:** the message and row shapes, how changes are
  sent (diffs or snapshots, IDs, ordering), and pagination and anchoring
  (opening at a message, jumping to the newest).
- **How cells are built:** UIKit or SwiftUI in cells (UIKit is likely,
  for control and speed), text rendering (TextKit, attributed strings),
  and loading images and video (caching, decoding, downsampling).
- **Integration:** the keyboard and the floating composer, the long
  press lift into the glass menu, swiping to reveal times, threads, and
  the typing indicator handoff.
- **The escape hatch mechanism:** hosting a React surface in a cell
  with Fabric, and keeping its height measured.
- **Android parity** and the order of work: iOS first, Android behind
  it.
- **Accessibility:** VoiceOver and TalkBack for every native cell.
- **The plan to start with:** the first priority after the hotfix is a
  short iOS spike (text, photo, and link cards; prepending older pages
  while flinging; animated arrivals; the keyboard), measured on Shawn's
  phone against the current list. Then the plan above.

## Meanwhile

- The 2026-10-22 production lag is being fixed in its own hotfix thread
  (`t3/hotfix-older-messages-lag`), from main.
- No new feature work on the React Native list. Only fixes that keep it
  usable until the native list replaces it.
- PR #258 (`t3/message-list-performance`) holds the last round of work
  on it: cheaper rows, the motion fixes, the firehose, opens that don't
  hang, the motion check, and memory findings. Parts that aren't about
  the list (opens from notifications, Convex, memory, avatars, the motion
  check) can be split out and merged on their own. The rest is
  reference for the native rebuild (`message-list-v2.md` has the log).
