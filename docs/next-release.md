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

## From PR #157: AI Support and the Vera assistant

Vera Support now answers with a model, files bug reports as GitHub issues,
and follows them; a new `vera@vera.chat` assistant answers questions. Both
run on the Convex AI Gateway (no key; the BSX team's paid plan covers it).
This release must deploy the backend (`--with-backend`, or
`pnpm release backend production` with the update).

### 1. Check the GitHub token for bug reports

**When:** before the production backend deploy.

Already done on 2026-10-19: a fine-grained token `vera-support-bot`
(bentsignal/vera only: Issues read and write, Pull requests and Contents
read-only) is set as `GITHUB_TOKEN`, with `GITHUB_REPOSITORY=bentsignal/vera`,
on production, the shared dev deployment, and PR #157's isolated one, and
the "user report" label exists. Just confirm:

```sh
npx convex env list --prod | cut -d= -f1 | grep GITHUB_
gh label list --repo bentsignal/vera | grep "user report"
```

**Verify:** both `GITHUB_REPOSITORY` and `GITHUB_TOKEN` are listed, and the
label is there.

`PARALLEL_API_KEY` (Vera's web search) is already set on production, the
shared dev deployment, and this PR's isolated one. Check it's there:
`npx convex env list --prod | cut -d= -f1 | grep PARALLEL_API_KEY`.

### 2. Create the Vera account and try both assistants

**When:** after the production backend deploy.

```sh
npx convex run vera:setup --prod
npx convex run support:setup --prod
```

Ask Shawn whether Vera should say hello to every existing account now
(`npx convex run vera:welcomeEveryone --prod`, which messages everyone).
New accounts get the hello either way.

**Verify:** Shawn messages `vera@vera.chat` in the TestFlight app and gets
a short answer, and a question about today's news gets a current one
(`npx convex run usage:summary '{"bot":"vera"}' --prod` shows a search). He sends Vera Support a test bug report (support asks for
details and shows the public-report notice first); a GitHub issue labeled
"user report" appears without his address in it. Close that issue as not
planned with a comment ("Closing: this was a release test."), run
`npx convex run supportReports:track --prod`, and check that support
explains the closing in its own words within a minute.

### 3. Answer the support messages that waited

**When:** right after step 2 (so nobody writes in again first), and only
when Shawn says to go ahead: it messages real people.

Support's inbox on production has feedback from before it answered anyone
(Calvin, Adam, and Elias sent real feedback; a few others sent jokes).
PR #157's thread checked each item against main, filed GitHub issues for
what's still open, and wrote the input for `answerAll`: a note per
conversation saying what's fixed and what's tracked, and the issues to
follow for each person. It's at `~/.vera/support-backlog.json`, outside
the repo because it names people. If it's missing, stop and ask Shawn.

```sh
npx convex run supportBacklog:pending --prod
npx convex run supportBacklog:answerAll "$(cat ~/.vera/support-backlog.json)" --prod
```

`answerAll` checks the whole input before messaging anyone (an unknown
issue or conversation fails it with nothing sent). Support answers each
conversation 30 seconds apart, and stays quiet with people who only sent
a joke.

**Verify:** a few minutes later, `npx convex run supportBacklog:pending
--prod` lists nothing, `npx convex run support:read
'{"conversationId":"<each listed one>"}' --prod` shows support's summary,
and `npx convex run supportReports:list '{"open":true}' --prod` shows the
followed issues.

### 4. Remove the backlog command

**When:** after step 3 is verified.

It was only for this one pass. In a PR of its own, delete
`services/backend/convex/supportBacklog.ts`, the `BACKLOG` instructions
and `backlog` handling (`supportAgent.ts`, `agent.ts`, `agentTools.ts`,
`assistantHook.ts` `scheduleReply`, and the `backlog` field in
`schema.ts`), and its sections in `services/backend/README.md` and the
`support-inbox` skill. Keep the team note (`note`), which closed issues
use. Then delete `~/.vera/support-backlog.json`.

**Verify:** `rg -n "supportBacklog|backlog" services/backend .agents`
finds nothing.
