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

## Building it (started 2026-10-22, evening)

Shawn wants it done as fast as possible, on iOS and Android, because the
current list is unusable in his friends' busiest chat even after the
hotfix (#265).

### The contract

`apps/mobile/src/features/native-list/contract.ts` is the contract. Its
version and its rules are at the top of the file. Every platform builds to
it, and changing it means changing both sides. The JavaScript binding is
`native.ts` beside it. The native code is
`apps/mobile/modules/message-list/` (an Expo module: `ios/` in Swift,
`android/` in Kotlin), registered as the module `MessageList` with the view
`MessageList`. Its constant `support` reports the contract version and the
row kinds and block types it draws.

### Branches and threads

- `t3/native-message-list`: the contract and this plan. Everything merges
  here, then to main in one PR.
- `t3/native-message-list-ios`: the Swift implementation.
- `t3/native-message-list-android`: the Kotlin implementation.
- `t3/native-message-list-js`: the JavaScript side. It maps messages to
  rows and blocks, handles events (menus, threads, reactions, the photo
  viewer), runs the switch, adds the store-update prompt, and keeps the
  React Native list as the fallback.

Each platform thread touches only its own directory, so they merge
cleanly.

### What it must do (from the current list; match it, don't redesign)

- **Inverted:** newest at the bottom, opening on the newest message (or
  `initialRowId`, centered and tinted).
- **Older pages:** `reachedOlder` fires `loadAheadScreens` screens from
  the top. They're inserted above the reader without moving anything, and
  a fast fling never hits the top while pages load.
- **New messages (`arrived`):** at the bottom, the messages above make
  room over `moveMs` and the new one rises in and fades in (`fadeMs`).
  Scrolled up, nothing on screen moves. Past `firehoseFrom` arrivals in
  `firehoseWindowMs`, rows show at once with no animation, until it's
  down to `firehoseUntil`.
- **Bubbles:**
  - iMessage shapes and colors, tails on the last bubble of a run, and
    jumbo emoji.
  - The sender's name over a run in groups, and a photo by the tail.
  - Times revealed by dragging the list left.
- **Stacked:** a photo, name, and time over a run; every message
  left-aligned.
- **Reactions:**
  - Bubbles: tapbacks over the top corner, up to three fanned and the
    newest in front.
  - Stacked: glass chips under the message.
  - Adding one pops it in, removing one shrinks it out, and the messages
    make room smoothly with no jump. Tapping a chip toggles it (a `press`
    with `reactionKey`).
- **Media:**
  - One photo or video alone.
  - Several in stacked rows: an edge-to-edge horizontal carousel that
    snaps item by item, each item with its own reactions.
  - Several in bubbles: a stack of cards swiped left and right, like
    Messages.
  - Tapping reports the index, so JavaScript opens the viewer on that item
    and swipes through the whole group. The branch
    `t3/stacked-media-carousel` has the design in React Native (not
    merged): use it as the reference for how it should look.
- **Link cards, files, quotes, and footer lines** ("2 replies" with
  photos, "Edited", "Not sent").
- **The typing indicator** at the bottom:
  - bubbles: a bubble of dots with photos;
  - stacked: photos, a label, and dots.
  - A message from someone typing grows out of their indicator.
- **The keyboard:** follow it frame by frame, and dismiss it
  interactively by dragging the list.
- **Holding or double tapping** a message or part sends `hold` with its
  frame. JavaScript opens the glass menu with its own copy, and native
  hides the row while `liftedRowId` is set.
- **`visible`** reports the rows on screen (read marks), and
  `nearLatest` drives the jump-to-latest button.
- **Accessibility:** each message is one element, read from
  `accessibilityLabel`. Its links, media, and reactions are buttons.

### Switching to it, and getting people onto it

- The switch is decided in JavaScript, so it ships over the air. The
  native list is used when the binary has it (`nativeSupport` isn't
  null), the contract version matches, and it's switched on. That's off
  by default at first and on for Shawn's account (and in Developer
  settings). Shawn tries it in the production app; when he's happy, an OTA
  update turns it on for everyone. The React Native list stays as the
  fallback until the native one has proven itself.
- **Forced store update:** a binary without the native list can't use it.
  So an OTA update adds a prompt for people on an older binary: "Update
  Vera" with one button that opens Vera's TestFlight page (on Android,
  wherever Shawn's Android friends install it). They update, open the app,
  and they're on it. The app already has an overlay for forced OTA
  updates (`features/updates`). This is its store-build twin, shown when
  `nativeSupport` is null and the minimum is a native-list binary.

### Done when

- iOS and Android draw every row kind and block type above, matching the
  current list.
- Flinging up through a media-heavy chat of hundreds of messages (a seed
  with photos, videos, link cards, and reactions) holds 60 fps in a
  production build. Floods of new messages too.
- The motion check passes for every scenario, both layouts.
- Shawn has tried it in his real group chat in the production app.

## Integration (2026-10-23, overnight)

`t3/native-message-list-integration` merges #266 (JavaScript), #277 (iOS)
and #275 (Android) without merging the PRs, wires the native list into the
real app, and checks it against the React Native list in a seeded busy
group (`devBusy:seed '{"count":600,"livened":300}'` from `t3/data-pass`,
brought over unchanged) on an isolated backend.

### The switch

- On by default in dev builds (`NATIVE_LIST.byDefault = env.devTools`),
  off in production until Shawn turns it on over the air.
- A "Testing" section on a conversation's info page (tap the header) has
  the switch in dev builds and for `NATIVE_LIST.testers`, so the two
  lists can be compared in the same chat: flip it, go back. It's also in
  Developer settings (dev builds) and More → About (testers, production).
- Scripts: `veraDev.nativeList(true|false)` flips it and returns which
  list conversations show (`"native"` or `"rn"`).

### Motion check

`scripts/motion/check.sh` (from `t3/message-list-performance`) tests the
native list by default and the React Native one with `MOTION_LIST=rn`. It
flips the switch first and fails a scenario that shows the other list.

### Contract additions from the integration

All optional, so older binaries and older JavaScript keep working:

- `insets.keyboardOverlap`: the composer rises by the keyboard minus its
  own bottom inset (20 pt on iOS), not minus the safe area, so without it
  the newest message sat 14 pt behind the composer with the keyboard up.
- `keyboardFrozen`: held while the long-press menu's modal has the
  keyboard down (iOS), as `useMenuKeyboard` does for the React Native list.
- `alignTop`: threads start at the top, under their original
  (`useBlankSpace`).

### What the comparison found

- Opening at a message in the busy group: the native list is placed and
  showing at once. The React Native list stalled JavaScript for 15 s and
  more (`VirtualizedList … dt: 15695`) and the app didn't answer for most
  of a minute.
- Stacked text in the React Native list sets no line height, so it's San
  Francisco's own (20.3 pt at 17); bubbles set 22. The theme now sends
  20.3 for stacked body text.
- iOS draws bubble text at 21.2 pt line spacing instead of 22, and
  bubbles 4.5 pt narrower than the React Native list's 75% of the row
  (sent to the iOS thread).

### Motion check, first run (iOS simulator, busy group)

`MOTION_LIST=native`: 16 of 18 scenarios pass (arrival, typing to a
message, reaction on and off, first reply, send, edit, delete, in both
layouts). Both firehoses fail on jump-backs: `dev:burst` sends each message
at a random moment around its slot, so later messages land between rows
already shown, which a firehose shows at once. The React Native list fails
the same scenario worse (bubbles 6 failing, stacked 11 with a blank band,
against native's 7 and 1).

### Codex handoff and comparison audit (2026-10-23)

Recovered the interrupted run with a clean worktree at `01150da0`.
The Android build had finished and its production bundle eventually
connected to Metro's debugger. Confirmed `__DEV__` is false before testing.
Merged iOS `8c31dc3c` and Android `dab9c9b7`, then Android's conservative
pagination estimate, `49e6ae66`. Final phone builds wait for both platform
threads' explicit native-ready SHAs.

The first Android diagnostic used 5,500 dp/s for 10 seconds and 150
arrivals over 15 seconds in the original busy group:

| Scenario | List         | Main frames over 16.7 ms | Worst main frame | JS stalls over 50 ms | Worst JS gap | Distance / edge wait |
| -------- | ------------ | ------------------------ | ---------------- | -------------------- | ------------ | -------------------- |
| Fling    | React Native | 60 / 390                 | 62.1 ms          | 60                   | 676 ms       | 27,919 dp / 5,133 ms |
| Fling    | Native       | 11 / 401                 | 57.4 ms          | 33                   | 398 ms       | 39,874 dp / 2,533 ms |
| Burst    | React Native | 167 / 420                | 127.3 ms         | 104                  | 889 ms       | n/a                  |
| Burst    | Native       | 0 / 112                  | 6.5 ms           | 17                   | 67 ms        | n/a                  |

These are diagnostic numbers, not the final comparison. That script ran
the React Native burst before the native fling, adding 150 text messages
to its starting data. It also captured only Android main-thread work,
without `sim.sh frames` or the queue's protection against device boots.
The native burst was checked afterward and did show its newest message.
The loaded-edge wait was sent to Android, which found that tall visible
media could delay requesting short rows above it. JavaScript sends
`loadAheadScreens: 3`.

The corrected comparison runs both flings before either burst and captures
UI frame timing on both platforms, plus Android main-thread work. It
checks the production bundle and the mounted list. A new 600-message,
300-livened seed prevents earlier test bursts from burying the media.
Its ID is in `.cache/bench-clean-seed.json`; results and evidence stay in
`.cache/`, not Git.

`scripts/sim.sh build` caches a native client without entering the device
queue. Run it through `scripts/bench/with-lock.sh`, then `sim.sh up`
outside the lock. The motion check now accepts `--android`.

The simulator never reproduced the 5 FPS in Shawn's real chat. These
measurements establish a floor; his phones remain the performance test.

## iOS implementation check, 2026-10-23

PR #277 targets `t3/native-message-list`. The iOS module now supports the
real-view lift, press shrink, cached deck blur, React custom rows measured
by Fabric, and oldest-first accessibility order with paging. The lift uses
JavaScript's menu geometry and spring, then returns the same views during
the menu's 240 ms close. Plain stacked text gets the existing menu card.
`NativeSupport.features` advertises `lift`, `customRows`, and `benchFling`.

The integration thread owns real-app parity checks, the head-to-head
against React Native, and the phone clients. It supplied `keyboardOverlap`,
`keyboardFrozen`, `alignTop`, and the `replies` header style. iOS copies the
contract fields and the React Native divider's measurements. Its native
height and diff suite has 33 checks, run with
`apps/mobile/modules/message-list/ios/Tests/run.sh`.

The native benchmark drives `setContentOffset(animated: false)` on a
display link, towards older messages, and reports distance and edge wait.
The dev-screen baseline at 5,500 pt/s travelled 44,000 pt in eight seconds
with no edge wait. The 9.767-second frame capture had five slow frames,
worst 43.9 ms. It includes the button tap that starts the benchmark and is
not a comparison with React Native. The integration thread must compare
the same data, production bundle, speed, and duration. The simulator has
not reproduced the reported 5 FPS in Shawn's chat; the phone test remains
the release gate.

## Final integration checks in progress, 2026-10-23

Both native owners explicitly marked their binaries ready: iOS `6b264fa2`
and Android `a3615b73`. Both are merged into the integration branch.
Android's optional `liftHandoff` feature adds `landLift(): Promise<void>`.
The app clears its lift prop and starts native landing and the menu's
240 ms fade together. It removes the Modal and runs the chosen action
only after both finish. Older binaries and iOS retain their current close
timing. Duplicate close taps are ignored. Android verified two photo
open/close cycles with no analyzer flags across 103 changed frames.

The first fair combined iOS production-bundle run used three-screen page
lead on both lists, 5,500 pt/s for ten seconds, and 150 arrivals over
15 seconds. No native builds or device boots overlapped.

| Layout  | Scenario | RN slow / frames | Native slow / frames | RN worst | Native worst |
| ------- | -------- | ---------------- | -------------------- | -------- | ------------ |
| Bubbles | Scroll   | 85 / 596         | 4 / 727              | 128.9 ms | 40.5 ms      |
| Stacked | Scroll   | 69 / 629         | 1 / 729              | 60.8 ms  | 43.7 ms      |
| Bubbles | Burst    | 167 / 1001       | 3 / 1236             | 91.7 ms  | 36.8 ms      |
| Stacked | Burst    | 169 / 1024       | 5 / 1249             | 69.1 ms  | 43.4 ms      |

Bubbles travelled 47,461 pt with 707 ms of loaded-edge wait on RN, versus
54,703 pt with 50 ms on native. Stacked travelled 51,390 pt on RN and
55,000 on native, both with no wait. Native page lead is now five screens
to give network/JavaScript more time during fast scrolling; a fresh media
seed is queued for the follow-up. RN keeps its existing three screens.
The final report must distinguish this tuning from the baseline above.

Real-app iOS checks on the final binary include both layouts and themes,
photo viewer opening/return, a composer send with the keyboard up, thread
original/replies placement, reaction count on/off, anchored opening,
jump-to-latest, and menu open/close. Carousel item reactions target the
selected attachment. Gesture recordings and the full motion script are
still being collected. Filled iOS stacked reaction chips remain an
explicit visual difference from RN glass; the native owner retained them
after measuring the glass cost.

The active PR is #284 against `t3/native-message-list`, still draft while
final evidence and phone builds are pending. No PR has been merged.

### Revised phone deliverable

Shawn changed the final deliverable to private production-config preview
builds, replacing the planned dev clients. `preview` extends production
configuration, uses `vera.chat` and `chat.vera.app`, and has its own update
channel. iOS is ad hoc Release; Android is a locally signed APK. Upload
only to install pages. Submit nothing to App Store Connect, TestFlight, or
Play, and publish no production OTA. Preview defaults the native list on
and exposes its switch in conversation info and More → About for every
account. Store builds keep their previous default.

`pnpm release plan` at `0c34b774` reports three backend differences from
`backend/deploy/20261022T232315`: devBusy.ts, devFullSeed.ts, and generated
API declarations. They only add/change development seed helpers. Normal
app APIs, protocol, auth, and schema are unchanged; the preview needs no
production backend deploy. Production breaking version is 3, matching the
app source. The live Android association file and production passkey
origins include the EAS production certificate E6:A1:C5:45…44:5F, as well
as Google's Play certificate. Verify the actual APK certificate after
building. EAS preview channel/branch were created empty, with no OTA.

iOS installs over TestFlight using the same application identifier/team;
verify the built entitlements and keep the existing app container. Android
requires uninstalling the Play copy because its signer differs, then
signing in again. Server conversations and passkeys remain with the
account/provider. Returning to Play requires another uninstall/reinstall.
Report final measurements and install links to orchestrator thread
`mcp:e2458cbe-16a5-437c-94b3-475f2a786cb1`, plus the full report here and
in #284.

Final iOS motion script result is native 16/18 and RN 12/18. Native
firehoses have 1 bubble and 6 stacked flags, versus RN's 18 and 21. iOS
reviewed all four native windows. The bubble message moves monotonically
up; stacked samples replace complete batches after 0.63–1.09 s gaps. The
analyzer searches only ±40 pt and has no row identity or timestamp-gap
gating, so repeated Firehose labels/avatars can correlate incorrectly. No
confirmed native reversal or hide/show defect was found. Keep the formal
flags and the limitation; this is not an all-pass motion gate. Native SHA
remains 6b264fa2, and its owner's devices and Metro are down.

### Final iOS production-bundle comparison

The five-screen native prefetch recheck used a fresh 600-message media seed,
5,500 pt/s for ten seconds, then 150 arrivals over 15 seconds. Both lists
started with 50 loaded messages. Capture FPS includes settling and driver
round trips. There were no concurrent builds or device boots.

| Layout  | Scenario | RN capture FPS | Native capture FPS | RN slow | Native slow | RN worst | Native worst |
| ------- | -------- | -------------- | ------------------ | ------- | ----------- | -------- | ------------ |
| Bubbles | Scroll   | 49.4           | 59.8               | 84      | 2           | 73.2 ms  | 35.6 ms      |
| Stacked | Scroll   | 52.4           | 59.7               | 72      | 4           | 83.3 ms  | 38.6 ms      |
| Bubbles | Burst    | 47.2           | 59.6               | 163     | 9           | 80.1 ms  | 39.3 ms      |
| Stacked | Burst    | 50.8           | 59.6               | 157     | 8           | 75.0 ms  | 40.7 ms      |

Native scrolled 55,000 pt in both layouts with zero edge wait and loaded
50 → 450 rows. RN bubbles scrolled 48,097 pt with 483 ms edge wait,
50 → 350 rows; RN stacked scrolled 51,000 pt with zero edge wait,
50 → 400. JS stalls above 50 ms fell from 60/67/101/108 to 5/5/12/12
in the table's order. This improves the baseline but does not satisfy a
zero-slow-frame claim. Shawn's real group chat remains the phone gate.

Native dark-mode motion passed 17/18 scenarios. Only stacked firehose
failed, with two failing and six minor flags. Light-mode results and the
analyzer limitation above remain unchanged. All three runs had zero Metro
errors. Real-app media verification also exercised selected-photo viewer
opening after carousel swipe, deck swipe, video playback, photo menu
open/close, avatar and mention profile navigation, URL opening in the
in-app browser, and the timestamp swipe. Recorded evidence is in .cache.
The iOS simulator and Metro were brought down after capture.

### Android final-pass gaps and transport check

The first final Android capture was discarded after the dev client crashed
in OkHttp 4.12.0's WebSocket deflater cleanup. Both RN inspector and app
sync use this provider. A live sync handshake accepts permessage-deflate,
so the production app can reach the affected code path. This establishes
source exposure, not observed production incidents. No app crash telemetry
SDK is configured. A read-only Play Developer Reporting request returned
403 SERVICE_DISABLED; no API was enabled or console opened.

Profiling Metro now declines compression on /inspector/device and
/inspector/network only. A real WebSocket handshake test confirms both
inspector endpoints stay uncompressed while an ordinary application
endpoint still negotiates compression. Failed frame captures also release
the simulator queue's measurement slot. Android is adding an early shared
OkHttp provider policy to disable outbound WebSocket compression while
retaining existing client configuration and inbound compression.

Real-app carousel QA found that holding the third photo in a captioned
stacked row lifted its caption instead. Android's containing-block lookup
must match every media item's part, not only the lane part. The same pass
caught an eager recycle-on-detach crash during ScreenStack viewer
navigation; both native fixes must be verified in the combined client.

The Android viewer's Compose Close button did not invoke its handler in
both single-photo and group viewers, including with an explicit host size.
It now uses a React Native button with Material close symbol and a 48 dp
hit area. The real app's close action returned to the conversation, and
an after-fix recording/screenshot were captured. Temporary probes were
removed. Carousel/keyboard/media QA continues before final phone builds.

Final Android source is now ada19507. It adds the early shared-client
outbound compression policy, containing-block lookup for all carousel
item parts, and detach/reparent hardening. Eleven message-list JVM tests,
two networking tests, and plugin startup tests pass. A negative-control
host test reproduces the prior attached-view exception with eager detach
recycling enabled, then passes with the normal detach policy.

The combined native client passed a wire test with 25 native app WebSocket
exchanges. Compression was negotiated on every connection, every outgoing
client frame had RSV1 clear, and all 25 compressed server echoes had RSV1
set and decoded correctly. Twenty repeated inspector attach/detach probes
also passed. The fresh fatal logcat buffer was empty. Three real-app
third-photo menu-close/viewer-open/close cycles passed with snapshot guards.
The first recording transfer was lost in subsequent emulator cleanup, so
the same guarded cycle is being recorded again before final delivery.

The theme mapper omitted the contract's existing backgroundElevated field.
It now sends the same CSS background as RN link cards, fixing their black
instead of elevated gray background in dark mode. Android before/after
screenshots are required; iOS screenshots will be refreshed too.

Final Android FPS captures were discarded after ADB lost emulator-5644
and the queue reclaimed it. The launcher now chooses free standard console
ports 5560–5584, within ADB's discovery range, instead of ports through5658.
No queue daemon/config was changed or bypassed. Measurements must be rerun.

iOS scroll-video blank flags were reviewed separately. They all occur as
the same hay-bale photo crosses the viewport, whose large white sky is
classified as a blank band in both lists. First and last flagged native
frames show the complete image moving through, with no missing row.
Flung rows also exceed the analyzer's 40 pt matching range; its movement
flags during these fast scroll clips are not a motion pass/fail result.

### Final Android capture recovery

Android source-ready advanced to 4f87adfe, merged on top of ada19507.
Incoming URL spans now inherit the actual row text color, matching RN;
mentions retain accent and outgoing links retain onAccent. Its native
compile, eleven JVM checks, ordered pnpm checks, and all nine CI checks
passed. This paint-only change needs the final combined binary.

The emulator remains on a standard console port. Profiling now uses
10.0.2.2 for Metro, avoiding loss of its debugger connection when an ADB
reverse mapping disappears. Recorders detach from the launching tool,
finish writing their MP4 index before their adb shell exits, and stop
only their own remote PID. Videos transfer without redundant ADB
compression. Failed captures and incomplete MP4s are discarded.

Valid Android scroll captures are 20261023-132229 and 20261023-132616.
Both use the same fresh 600-message group and 5,500 dp/s for ten seconds,
with production JavaScript and native ada19507. No builds or boots
concurred. Bubbles RN/native: 38.0/55.1 capture FPS, 132/51 slow intervals,
166.7/50.0 ms worst interval, 73/19 JS stalls, 44,396/55,091 dp travel,
367/0 ms edge wait. RN started with 50 loaded rows; native's normal
prefetch had already loaded 100. Stacked RN/native: 55.5/58.9 FPS,
52/13 slow intervals, 50.0/50.0 ms worst, 65/14 JS stalls,
44,858/55,091 dp travel, 1,850/0 ms edge wait, both starting at 50 rows.
Native ended at 450 loaded rows versus RN's 350 in both layouts.

Main-thread samples over 16.7 ms were 146/367 versus 2/548 for bubbles,
and 47/516 versus 1/586 for stacked. Bubbles main-thread p90 was
48.9/5.1 ms; stacked 16.0/4.4 ms. These distinguish app layout work from
software-rendered emulator intervals. Mac CPU during bubbles was 59/79%
average, 81/91% peak; report this load and do not claim a quiet-host or
zero-slow-frame gate. Burst measurements and motion review follow.

Final Android bursts are 20261023-133640 and 20261023-133840.
Bubbles RN/native: 28.4/59.5 capture FPS, 143/9 slow intervals,
2,400/50 ms worst flagged interval, 91/25 JS stalls. Main-thread samples
over 16.7 ms: 151/409 versus 0/97, worst work 2,392/9.1 ms.
Stacked: 55.2/60.0 FPS, 76/0 slow intervals, 66.7 ms versus no flagged
interval, 65/22 JS stalls. Main work over 16.7 ms: 70/257 versus 0/69,
worst 60.6/2.6 ms. Burst host CPU averaged RN/native 46/16% bubbles,
31/16% stacked; no builds or boots overlapped. These are sequential bursts
in the same chat, so histories grow, with normal prefetch/cache behavior.
The full final numbers and qualifications were sent to the orchestrator.

The final integration simulator clients are Android fingerprint
74e6d0b780c70a55b1a4fd913bdda567e45a871d and iOS
2c4ffa31b9fe514107b8d08519d168b6401cabac. Both compile. Final dark-card
screenshots verify the shared elevated background on both platforms, and
Android incoming URLs now inherit row text color. The eight Android
RN/native × bubbles/stacked × light/dark screenshots were refreshed.
Actual Android composer fill/send, keyboard placement, opening its thread,
sending a reply, and the reply divider were exercised. Emulator notification
permission was revoked to keep bot notifications out of captures.

The first Android motion set was invalidated after frame review found a
Pixel Launcher ANR dialog over it. Vera's fatal buffer stayed empty. The
system alert was dismissed through agent-device, and the contaminated
folder is marked invalid-launcher-anr. The clean native replacement is
20261023-140922: 16/18 scenarios pass with zero Metro errors. Only firehose
is formally flagged: bubbles 4 failing/3 minor in 51 changed frames,
stacked 1 failing/3 minor in 53 changed frames. The Android owner has the
exact windows for source/frame review. RN is running the same scenarios.
The preserved scroll/burst numbers predate this launcher ANR and are separate.

The matching clean Android RN run is 20261023-141800: 12/18 with zero
Metro errors. RN firehose has eight bubbles and ten stacked failing flags;
other flagged scenarios are bubbles first reply/send/delete and stacked
first reply. Native has only the two firehose scenarios flagged. The
Android source review found no reverse-scroll path or confirmed native
defect. Row-identity review of the short native windows remains nonblocking.
`pnpm release plan` was refreshed at 97d1b670 before the private builds;
backend differences are still only the previously reviewed dev helpers.

The Android owner completed row-identity review without changing code.
Bubbles Firehose1 stays present and moves monotonically upward through
3.435–3.552 s. The apparent 35 pt matches belong to other repeated rows
while actual updates exceed the 40 pt search. Stacked's neighboring
captures are 6.754/7.190/7.636 s; Firehose27 moves from bottom to top,
then 33/31/34/35/36/37 keep order and move upward. No missing or reversing
row was observed. Retain the formal 16/18 analyzer result and this manual
alias disposition; thresholds were not widened.

Final third-photo QA on 4f87adfe passed three guarded hold/land/viewer/close
cycles, with the correct antler image lifting and returning. Later the
2 GB Android guest entered system-wide swap thrashing and lowmemorykiller
killed Vera plus numerous system apps. Vera's kill freed 840,848 kB RSS
and 1,139,368 kB swap; the Java fatal buffer was empty. Retained pushed
conversation screens are a driver hypothesis, not an established cause.
The preceding numeric and clean motion captures remain separate evidence.

A bounded fresh-launch ordinary photo-three flow then passed three more
hold/menu/viewer/close cycles without adding conversation routes. PID14553
survived throughout. Baseline and cycle PSS, kB: 712675, 745084, 751466, 752836. RSS: 783644, 542256, 527472, 510304; swap PSS: 25493, 281422,
302288, 320242. The growth tapered to 6.4 MB then 1.4 MB. dumpsys activity
showed two native Screen views and the same two unique ScreenStackFragments
before/after. This ordinary path did not reproduce the kill. Keep the
stress-session memory limit unresolved for phone testing; no heap audit or
new native code was added.

The Android video route and controls opened, but playback screenshots were
black in this software-GL emulator. No decoder exception was found. Full
photo viewer/Close is verified; Android video rendering remains a physical
phone check. iOS moving-timestamp playback is verified. Do not describe
Android playback as visually confirmed.

Final Android side-by-side evidence has both layouts for fling, burst,
reaction and hold, RN left/native right. These short visual clips are
separate from the numeric captures: six-second flings, firehose sixty
messages over six seconds, and stacked reaction on/off assembled from
the clean motion cases. The hold driver now excludes aggregate list and
scroll-area accessibility nodes when selecting a message. Final ordered
lint/typecheck/test/React Doctor against origin/t3/native-message-list,
then format:fix all pass. Both devices and Metro are down. Private preview
builds are the remaining deliverable; no store submission or OTA occurred.

Private iOS build began 2026-10-23 14:42 EDT from 7be83bbb using
`eas build --local --profile preview`. Both production-identity ad hoc
credentials are ready and Release archive compilation is underway.
Android follows serially. No build was submitted to a store or TestFlight.

iPhone preview build 10 succeeded at 14:48 EDT. Strict code signature,
ad hoc provisioning, production push entitlement and associated domains
pass. Runtime 6e60a1ac81b3d72068021adf0711d38c0f5fc75e matches the production
source fingerprint. Embedded JS contains vera.chat and no isolated backend
hostname. Prior store archive 9 and this IPA have the same application ID,
team and implicit keychain configuration. Install over Vera without deleting
it to preserve sign-in/data; return by reinstalling TestFlight's Vera.
The HTTPS install page, manifest identity and delivered IPA size are verified:
https://vera-evidence.b-cdn.net/preview/ios/20261023-7be83bbb-f0a3d139d4a0/index.html
The ready link and switch location were sent immediately to the orchestrator.
Android private preview began at 14:48 EDT and continues independently.

Android preview build 7 succeeded at 14:55 EDT. The APK is non-debuggable,
package chat.vera.app, with vera.chat in its embedded bundle and no isolated
hostname. Compiled channel is preview; runtime
23784f5af2957fcfbdce43fd9cf78f0b70db3e98 matches the production source
fingerprint. The actual EAS certificate E6:A1:C5:45:24:F8:8C:7B:57:A9:66:9F:
DF:D5:23:0B:5A:86:83:8F:F3:16:E1:1C:F7:A1:95:E3:B2:10:44:5F matches live
production assetlinks and the passkey origin allowlist. This authorizes
passkeys and invite links; physical passkey sign-in is not yet tested.
The HTTPS install page, APK URL and delivered byte count are verified:
https://vera-evidence.b-cdn.net/preview/android/20261023-7be83bbb-95cc421bdbd7/index.html
Uninstall Play Vera first, install, sign in again. Server messages remain;
local session/drafts/unsent messages/cache are removed. Return by uninstalling
preview and reinstalling from Play. Both install links and these facts were
sent to the orchestrator as soon as each was ready. Native defaults on and
flips immediately at conversation title/details → Testing → Native Message
List, also More → About → Testing. No stores or production OTA were used.
