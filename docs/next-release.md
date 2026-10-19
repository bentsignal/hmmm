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

### 0. Remove the temporary "Wipe Chat with Vera" button

**When:** before the production build or update that ships the assistants.

Shawn asked for it only to test Vera from a clean slate; it doesn't ship.
Delete `services/backend/convex/devAssistants.ts`, the `wipeAssistantChat`
helper in `apps/mobile/src/features/dev/dev-tools.ts`, and the button and
`wipeVera` in `apps/mobile/src/features/dev/developer-section.tsx`, in a PR
of its own. (It already refuses to run without `DEV_TOOLS`, which
production never sets.)

**Verify:** `rg -n "wipeAssistantChat|devAssistants|wipeMine" apps services`
finds nothing.

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
planned, run `npx convex run supportReports:track --prod`, and check that
support tells him it won't be changed.

### 3. Answer the support messages that waited

**When:** after step 2, and only when Shawn says to go ahead: it messages
real people.

Support's inbox has reports from before it answered anyone. List them for
Shawn, then have support answer them (it apologizes for the wait, checks
GitHub for what's already fixed or reported, and follows up on the rest):

```sh
npx convex run supportBacklog:pending --prod
npx convex run supportBacklog:answerAll --prod
```

**Verify:** a few minutes later, `npx convex run supportBacklog:pending
--prod` lists nothing, and `npx convex run support:read
'{"conversationId":"<one of them>"}' --prod` shows support's reply.
