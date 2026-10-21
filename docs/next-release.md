# Next release: extra steps

One-off steps the next release needs on top of the normal flow in
[releasing.md](releasing.md). The `vera-release` skill requires working
through this file. Do every step in order, and check each one's **Verify**
before moving on. A step that fails or can't be done blocks the release; tell
Shawn instead of skipping it.

`pnpm release plan` lists these steps, and production builds and updates
refuse to run until `--next-release-done` confirms the ones due by then are
done. After the release, open a PR that removes the finished steps (leave
the heading and intro so the file stays in place for the next release).

Adding steps: any PR whose release needs something beyond `pnpm release`
adds a section here in that PR (see AGENTS.md → Releases).

### Import GitHub issues into support's known bugs

**When:** right after the production backend deploy.

Support now checks its own record of known bugs (`knownBugs`, see
`services/backend/convex/supportKnownBugs.ts`) before filing. The "follow
bug reports" cron fills it on its first run, but run the import once by
hand to see it work: it reads every issue on `bentsignal/vera`, links the
reports support filed before to theirs, and checks where each stands. It
only reads from GitHub and sends nobody anything. Safe to run again.

```sh
cd services/backend
npx convex run supportBugSync:backfill --prod
```

**Verify:** it prints `imported` equal to the repository's issue count
(`gh issue list --repo bentsignal/vera --state all --limit 500 --json number | jq length`),
and `npx convex run supportKnownBugs:list '{"open":true}' --prod` lists the
open issues, with each report from `supportReports:list` among some bug's
`followers`.
