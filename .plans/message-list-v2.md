# Message list v2: a list that keeps up (plan, 2026-10-21)

Follows [message-list-high-load.md](message-list-high-load.md) (PR #255,
merged): the data under the list now holds up, but the list itself breaks
under load. Shawn's phone test of #255, during and after a 300-message
burst:

- Scrolling up fast showed black (unrendered rows), then jumped somewhere
  else; you couldn't reach the top unless you scrolled slowly.
- Loading older messages moved the scroll bar 4–5 times per page.
- A bubble-sized black gap at the bottom after scrolling away and back.
- Lag toward the end of the burst, then the chat broke (black on reopen,
  a double push) until the app restarted.

## Why (measured in #255's follow-up)

- `FlatList` (inverted) does all of its virtualization on the JavaScript
  thread: which rows to render, mounting them, measuring them. A busy
  thread (a burst, a dev build) leaves the native scroll ahead of the rows.
- Rows are heavy: every row mounts its animation layers (arrival, lift,
  fades, press handling), whether it animates or not.
- One page of 50 older messages renders 8 rows at a time
  (`maxToRenderPerBatch`): 7–8 content-size steps over ~1.3s, each a
  scroll-bar jump. History loads one page at a time: ~0.8s request, ~1.5s
  to mount, then the next only once within 3 screens of the top: about
  3.5 screens every 4–5s.
- A row plays its arrival the first time it mounts, so rows that arrived
  while you were scrolled up arrive again when you scroll back down.
- A tap during a stall can push the same screen twice.

## Goals (Shawn, 2026-10-21)

- Look exactly as good as now, or better: no choppiness, jitter, layout
  shift, or flashes. A hard constraint.
- Much faster: a fast fling never shows blank rows and never reaches the
  top before older messages are there; history loads ahead, in one go.
- Busy chats (dozens of messages a second, bursts of hundreds) stay
  smooth: messages join in batches with one movement, as now but stronger.
- Convex queries fast and few: balance freshness against query count and
  cost.

## Approach

1. **Benchmark the list engines first**, on the same rows and data:
   - current: inverted `FlatList`
   - Legend List 3.6.0 (latest): non-inverted chat (`alignItemsAtEnd`,
     `maintainScrollAtEnd`), `maintainVisibleContentPosition`,
     recycling, adaptive rendering
   - FlashList 2.3.3 (latest): `maintainVisibleContentPosition` with
     `startRenderingFromBottom`, recycling, `getItemType`
   - if neither is good enough with no compromises: our own, likely a fork
     of the better one.
2. **Harness** (`features/dev/bench`, dev builds only): a synthetic
   conversation (thousands of realistic messages: text of every length,
   photos, link cards, replies, reactions, runs by the same author) shown
   with the real rows, and scripted scenarios:
   - fling: a constant-speed scroll on the UI thread, at several speeds
   - history: older pages arriving after a delay as the top nears
   - arrivals: synthetic messages at 5, 20, 50, 100, 200 a second
   - open: mounting the conversation
   Measured: blank area (frames recorded, then rows of bare background
   counted), UI-thread frames, JS-thread stalls, anchor drift (how far a
   visible message moves when content changes), content-size steps per
   page, and memory. Both a dev bundle and a production bundle
   (`--no-dev --minify`, same dev client), iOS and Android.
3. **Rows**: a cheap row by default; animation layers only on rows that
   are arriving, reacting, leaving, or lifted. Recycling-safe: per-message
   state (arrived, reaction space) lives outside the row.
4. **History**: keep several pages loaded ahead of the scroll position,
   bigger pages for older history, rendered in one go off screen.
5. **Busy-chat mode**: past a rate, arrivals batch per tick with one
   movement; a capped window of recent rows while at the bottom; scrolled
   up, the view stays put with a new-messages button.
6. **Convex**: fewer live queries per open conversation, small sealed
   live segments so updates carry little, history pages as one-shot
   fetches rather than live subscriptions where nothing changes.

## Log

### 2026-10-22: engine benchmark

Harness: `features/dev/bench` (`/dev-bench`), a seeded synthetic
conversation in the real rows. Production bundle served to the dev client
(`VERA_METRO_PROFILE=1 scripts/sim.sh up`; `__DEV__` false, scripts' hooks
kept), iOS simulator. A fling is driven on the UI thread at a constant
speed (`bench.fling`): agent-device's XCTest gestures read the whole
accessibility tree before each touch and stall the app, worse the more
rows are mounted, which skewed the first numbers against FlatList. Measured
from each run's recording: blank area (bands of bare background) and
motion steadiness (content shift between frames at their own timestamps,
against the driven speed); plus UI-thread frames (`sim.sh frames`) and
JS-thread stalls.

At 6000pt/s for 4s (24,000pt driven), 2000 messages loaded:

| | blank | slow frames | unsteady motion | distance |
| --- | --- | --- | --- | --- |
| FlatList (inverted), today's rows | 0% | 30 | 44% | 24.1k |
| FlatList, plain text rows | 0% | 0 | 0.9% | 24.1k |
| Legend List 3.6, 250pt draw | 0.4% | 0 | 23% | 38k |
| Legend List, 1000pt draw | 2.3% | 31 | 41% | 34.8k |
| Legend List, plain rows | 0% | 0 | 44% | 39k |
| Legend List, recycling | 2.4% | 67 | — | 65.7k |
| FlashList 2.3, 250pt draw | 1.7% | 64 | 65% | 37.5k |
| FlashList, today's rows w/o lift | 0% | 61 | 62% | 47.7k |

- Legend List and FlashList correct the scroll offset from JavaScript as
  rows are measured (travelling 50–170% further than driven), and the
  content visibly lurches even with plain rows and perfect frames
  (Legend 44% unsteady; FlashList moves backwards in 22–36 frames). That
  is the jitter the conversation left Legend List for in October.
- FlatList, anchored natively by the inverted scroll view, moves exactly
  as driven and is perfectly steady with cheap rows. Its slow frames are
  the rows' cost of mounting.
- At 10,000pt/s Legend shows 31–71% blank; FlatList none.

Decision: keep the inverted FlatList (a native list with the same anchoring
stays the next step if this isn't enough), and make rows cheap.

### Row cost (ablation, FlatList, 6000pt/s)

Skipping one piece at a time (slow frames, baseline 31–37 across runs):
the reveal-on-drag time 23, the gesture target 30, `InteractiveMessage`
12, the bubble tail and `Settle` no change; all of them 0 slow frames and
8.5% unsteady. The cost is many small per-row pieces (animated styles,
shared values, gesture handlers) that exist for moments one row at a time
has: a press, a drag, a reaction landing.

### History (FlatList, 5000pt/s up, pages after 600ms)

| page, asked for | stuck at the top |
| --- | --- |
| 50, 3 screens ahead (today) | 717ms, 3 times |
| 100, 3 screens ahead | 316ms |
| 100, 6 screens ahead | 33ms |
| 200, 8 screens ahead | 33ms |

A page still grows the content in 10–20 steps (rows mount 8 at a time):
the scroll bar's jumps.

### 2026-10-22: what a row cost, and the fixes

Profiled, not guessed: the JavaScript thread with Hermes's sampling
profiler over the debugger connection (function names survive the
production bundle), the UI thread with Instruments' Time Profiler
attached to the simulator, and native views counted with lldb. A new
probe (`engine=mount`, `bench.mount(rows, times)`) times mounting rows
out of sight, which is far steadier than counting slow frames.

Where a row's time went (production bundle, simulator, per row mounted):
4.3ms of JavaScript, a third of it creating Reanimated objects: each
`useSharedValue` makes a host and a guest object with closures (~0.5ms),
each `useAnimatedStyle` two more shared values, a mapper, and its
closure sent to the UI thread (the lift's closure held all 28 of the
moves' shared values). Then Fabric: about 9 native views and 17 levels
of nesting per text message, each new row laid out by Yoga on the
JavaScript thread. And a cost on every commit, for every mounted row:

- **Reanimated's props registry.** A style Reanimated sees change is
  kept and put back into every React commit after, until it's copied
  back into React (`ReanimatedCommitHook`, `cloneShadowTreeWithNewProps`).
  A row's first run counts as a change whenever it returns a transform
  (a new array each time), so every row mounted was cloned into every
  commit. Fixed by styles that are empty at rest (`allStill`): mounted
  rows no longer enter the registry. The biggest single win for the UI
  thread.

Changes, each measured (slow UI frames, 6000pt/s fling, 4s):

| | ms/row | slow frames |
| --- | --- | --- |
| start of the day | 4.3 | 26 |
| squeeze lent from a list-level pool (`squeeze.tsx`) | 3.9 | |
| one pair of tap recognizers for the list, not each row | 3.25 | |
| lift reads one derived value; leave state made on leaving | 3.1 | 12–17 |
| empty styles at rest (registry), fewer wrapper views | 2.9 | 0–1 |
| four rows per commit while scrolling | | 0 |

At 10,000pt/s: 8 slow frames at eight rows per commit, 1–3 at four, no
blank area at either. The unsteady-motion figure from the recording was
mostly the simulator recorder's own timestamps (8–25ms apart for
16.7ms frames): the content moved exactly 22 rows every frame. The
metric now judges the step itself: 2.2% uneven at 6000pt/s, 15% before.

History (5000pt/s, pages of 50 after 600ms): asking ten screens ahead
instead of three takes the time stuck at the top from 933ms to 0, with no
change to the backend.

Busy conversation (server burst into the seeded group, simulator): 150
messages in 15s went from 98 slow frames to 46–55.

- An arriving row's opacity was in the same animated style as its
  height, so each frame of its fade was a layout commit of the whole
  list (`performOperations` → Yoga on the UI thread). Split.
- Rows off screen now hold one unchanging style while something moves
  (`Growth.onScreen`, from the list's viewability), instead of a
  transform each frame: 98 → 86.
- Fewer rows mounted scale it down further (window 3: 17 slow), but a
  fling up right after would outrun the rows; not taken.

At 50 a second a batch is ~20 rows. Each opened with a move of its own,
there are four, and they took them from each other: rows drawn over one
another mid-rise. Rows measured in one frame now open together the next
(`arrive-batch.ts`): one move by all their heights, each rising by its
own and the newer ones' (what separate moves gave a batch of four). And
at rest the list mounts 24 rows a commit, so a batch mounts at once
rather than as blank space filled four at a time.

Fixed along the way: rows that came in while scrolled away no longer play
their arrival when you return to them (`noteRows`); a conversation,
thread, or profile pushed twice by a tap during a stall now opens once
(`dangerouslySingular`).

### 2026-10-22: next, from Shawn's phone test of #258

In order: (1) the reply flicker and the typing rubber band (done:
same-frame batches, typing held with paced messages); (2) the fast-scroll
jump to the bottom; (3) memory: measure a release build, cap what's kept
per conversation; (4) Convex: query count and cost, slow opens and opens
from a notification that hang; (5) firehose mode: past a rate, new
messages show at once with no rise or fade (as Discord's chat does when
it's busy), and animate again once it slows; (6) the message types made
easy to add without risking the rest.
