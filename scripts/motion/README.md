# The message list's motion check

The message list has a lot of small motion: messages rising in, the rows
above making room, reactions popping in and shrinking away, a thread's
count easing in, deleted messages closing, the typing indicator handing
its place to a message, and the firehose. Each of these depends on
details the code can't check for itself, such as a layout change and the
moves that hide it reaching the screen in the same frame. `check.sh`
plays each one in the simulator, records it, and fails when the
recording shows jank, so a change that breaks one is caught here rather
than on a phone.

```sh
scripts/sim.sh up && scripts/sim.sh signin   # and scripts/sim.sh seed, once
scripts/motion/check.sh                      # every scenario, bubbles and stacked
scripts/motion/check.sh react                # only scenarios whose name matches
```

It takes about ten minutes for everything. Run it after changing anything
under `apps/mobile/src/features/conversation` that moves: `moves.ts`,
`grow.tsx`, `arrive*.ts*`, `leave*`, reactions, `typing-*`, `entrance.tsx`,
`appearing.tsx`, `leaving.ts`. Recordings are kept in
`.cache/motion/<run>/` to look at the times it lists.

## What it flags

`analyze.ts` reads a recording (simulator recordings keep only frames
that changed), cuts the message area into short bands in three columns,
and works out how far each band moved between frames:

- **snap**: the screen at rest, then a band moves 6 points or more in one
  frame. A plain layout jump, or moves landing a frame before or after
  the space they make up for.
- **jump-back**: a band moves and comes back within two frames, or goes
  the wrong way for one frame in the middle of a move.
- **flicker**: a frame unlike both of its neighbours while they're alike
  (something gone for a frame, an opacity landing late).
- **blank**: a tall empty band between rows.

Jump-backs under 8 points and faint flickers (a band of text a fraction of a
point off for a frame) are reported as **minor** and
don't fail the check. Any React commit while rows move (a server's answer
landing then) can draw them a few points back for one frame, and the app
can't hold those off. Anything past that is something the list did.

`--allow-snaps` is for scenarios that are meant to jump, such as the
firehose. The analyzer tells moves apart by what rows show, so the check
posts a few different messages before each scenario.

## Why the moves land together

See the comments on `IN_COMMIT`, `afterCommit`, `ease`, and `land` in
`moves.ts`. In short: Reanimated waits to commit layout while React is
committing, but transforms can still reach the screen. So moves start two
frames after the React commit that brought the change, they ease only once
the change is laid out, and the app's own React renders (`useHeldHeight`,
`useLeaving`, `Entrance`) wait until the rows have stopped. Parts that come
in or go out use animated styles, not layout animations (`entering`,
`exiting`), which hold up the commit their space is in.
