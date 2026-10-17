---
name: close-it-out
description: Finish a piece of work in its worktree once Shawn is happy with it, covering merging its PR, tearing down an isolated backend, pushing main's backend to the shared dev deployment when the backend changed, stopping devices and dev servers, and settling the T3 Code thread. Use when Shawn says to close it out, wrap it up, finish up, or close out a piece of work.
---

# Close it out

"Close it out" is Shawn's approval to merge this thread's PR and finish
everything that follows a merge. It covers the PRs linked to this thread
and nothing else. Do each step that applies, in order, without asking.

## 1. Stop what's running

```sh
scripts/phone.sh down        # if it's serving his phone
scripts/sim.sh down          # and --android down, if either is up
```

Close any device in T3's Device panel (`device_close`).

## 2. Check the PR is ready

- Nothing uncommitted or unpushed in the worktree (`git status`, then
  `git push`).
- CI passed on the PR's latest commit (`gh pr checks <number> --watch`).
  Fix failures before merging.
- If the PR's description no longer matches the change (later feedback
  rounds), update it.

## 3. Merge

If this worktree has an isolated backend and Shawn signed in to it on his
phone, ask him to sign out of that throwaway account in Vera Dev first
(Settings > Accounts > the account > Sign Out), and wait for him.

```sh
gh pr merge <number> --merge --delete-branch
gh pr view <number> --json state     # MERGED
```

`gh pr merge` may say it can't switch to `main` because another checkout has
it. The merge still happened. Delete the remote branch with
`git push origin --delete <branch>` if it's still there. For a stack, merge
from the bottom up, retargeting each layer to `main` as the one below it
merges.

## 4. Backend

Only if the PR changed the backend (Convex functions, schema, or a plugin's
server code; anything that got an isolated backend):

```sh
scripts/backend.sh teardown          # if isolated
git fetch origin && git checkout --detach origin/main
pnpm install --frozen-lockfile
pnpm release backend dev
```

Then call what changed on the shared deployment (`npx convex run` from
`services/backend`, or `curl` the HTTP route) to check it's live.

## 5. Settle the T3 thread

- `list_thread_pull_requests`: every PR from this work is linked and
  merged. Link any that's missing.
- `unwatch_pull_request` for each PR being watched.
- `t3_thread_organize` with `action: "settle"`. It takes effect when your
  turn ends.

## 6. Report

Say what was merged (PR link), whether the dev backend was updated, and any
extra release steps the PR added to `docs/next-release.md`. Keep it short.
