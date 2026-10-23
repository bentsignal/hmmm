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

| Scenario | List | Main frames over 16.7 ms | Worst main frame | JS stalls over 50 ms | Worst JS gap | Distance / edge wait |
| --- | --- | --- | --- | --- | --- | --- |
| Fling | React Native | 60 / 390 | 62.1 ms | 60 | 676 ms | 27,919 dp / 5,133 ms |
| Fling | Native | 11 / 401 | 57.4 ms | 33 | 398 ms | 39,874 dp / 2,533 ms |
| Burst | React Native | 167 / 420 | 127.3 ms | 104 | 889 ms | n/a |
| Burst | Native | 0 / 112 | 6.5 ms | 17 | 67 ms | n/a |

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

| Layout | Scenario | RN slow / frames | Native slow / frames | RN worst | Native worst |
| --- | --- | --- | --- | --- | --- |
| Bubbles | Scroll | 85 / 596 | 4 / 727 | 128.9 ms | 40.5 ms |
| Stacked | Scroll | 69 / 629 | 1 / 729 | 60.8 ms | 43.7 ms |
| Bubbles | Burst | 167 / 1001 | 3 / 1236 | 91.7 ms | 36.8 ms |
| Stacked | Burst | 169 / 1024 | 5 / 1249 | 69.1 ms | 43.4 ms |

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

| Layout | Scenario | RN capture FPS | Native capture FPS | RN slow | Native slow | RN worst | Native worst |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Bubbles | Scroll | 49.4 | 59.8 | 84 | 2 | 73.2 ms | 35.6 ms |
| Stacked | Scroll | 52.4 | 59.7 | 72 | 4 | 83.3 ms | 38.6 ms |
| Bubbles | Burst | 47.2 | 59.6 | 163 | 9 | 80.1 ms | 39.3 ms |
| Stacked | Burst | 50.8 | 59.6 | 157 | 8 | 75.0 ms | 40.7 ms |

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
