# Performance checks

Jest runs the app's real components here with native modules mocked (see
`setup.ts`), to catch React work that makes the app janky before it reaches a
phone.

Their scripts (`pnpm test`, `pnpm typecheck`, `pnpm perf`) are in the repo
root's `package.json`, not the app's: the app's scripts are part of its native
fingerprint, so changing one there would call for a new dev client and store
build.

## In `pnpm test` (CI fails on these)

- **Render budgets** (`message-list.perf.tsx`): a new message, a reaction, and
  an older page each re-render only the messages they change. When every
  message on screen redraws for one update, sending and scrolling stutter on a
  slow phone. A budget that fails means something shared lost its identity: a
  prop, a profile, or a context value now new on every render.
- **The React Compiler compiles everything** (`compiler.perf.ts`): every
  component and hook in `src/` compiles with the compiler Metro uses. When it
  can't compile a function, it leaves it as written, with nothing memoized,
  and says nothing. The lint rule runs an older compiler that misses most of
  these. The message shows the file, the line, and the reason; usually
  rewriting a line fixes it (see "Fixing a skipped function").

## `pnpm perf` (a report in CI)

[Reassure](https://github.com/callstack/reassure) measures how long React
takes to render a conversation and each update (`message-list.perf-test.tsx`),
and how many commits each takes, over ten runs. The CI job `performance`
measures the PR's base and then the PR with the same tests and dependencies,
and writes the comparison to the job's summary. It doesn't fail the build: the
timings are React's work in Jest (in development mode, with nothing drawn), so
they vary from run to run and only show what changed relative to the base.

Locally, measure a baseline, change something, then measure again:

```sh
pnpm perf --baseline   # on the code to compare against
pnpm perf              # after the change; prints the comparison
```

Results are in `.reassure/` (ignored by git).

## Fixing a skipped function

What the compiler couldn't handle, and the fix:

- A computed key from a condition (`{ [incoming ? "right" : "left"]: x }`):
  write both objects out.
- A default parameter computed from another (`backToChat = then === undefined`):
  compute it in the body.
- Assigning a Reanimated shared value's `.value` inside a worklet: use
  `.set(...)` and `.get()`.
- A local variable with the same name as the function it's in.

## Frames on a device

Jest can't see frames: layout, native views, and animations aren't drawn
there. To find a stutter, measure it on a device. Run a release-like build,
log UI-thread frames over 24ms with a temporary Reanimated `useFrameCallback`
probe, and repeat the interaction the same way each time (open a chat by its
route, for example). That's how the open-fade and new-message stutters in
`.plans/message-list.md` were found.

[Flashlight](https://github.com/bamlab/flashlight) measures FPS and CPU on an
Android device. It doesn't run in CI here: it needs an Android emulator and a
release build on every run (well over the rest of CI's time on free runners),
and an emulator on a shared CI machine gives numbers too noisy to compare.
