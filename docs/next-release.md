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

## From PR #PRNUMBER: AI Support and the Vera assistant

Vera Support now answers with a model, files bug reports as GitHub issues,
and follows them; a new `vera@vera.chat` assistant answers questions. Both
run on the Convex AI Gateway (no key; the BSX team's paid plan covers it).
This release must deploy the backend (`--with-backend`, or
`pnpm release backend production` with the update).

### 1. Give production a GitHub token for bug reports

**When:** before the production backend deploy. Without it, support still
answers and keeps reports on the PDS, but files nothing and sends no
progress updates.

Ask Shawn to create a fine-grained personal access token at
https://github.com/settings/personal-access-tokens/new: resource owner
`bentsignal`, only the `bentsignal/vera` repository, permissions Issues
(read and write), Pull requests (read), and Contents (read), no expiry or
the longest he's comfortable with. Take it with the T3 `request_secret`
tool, never in chat. Then, from `services/backend`:

```sh
npx convex env set GITHUB_TOKEN '<token>' --prod
npx convex env set GITHUB_REPOSITORY bentsignal/vera --prod
gh label create "user report" --repo bentsignal/vera --color 0E8A16 \
  --description "Filed by Vera Support from a user's report" --force
```

**Verify:** `npx convex env get GITHUB_REPOSITORY --prod` prints
`bentsignal/vera`, and `gh label list --repo bentsignal/vera` shows
"user report".

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
a short answer. He sends Vera Support a test bug report (support asks for
details and shows the public-report notice first); a GitHub issue labeled
"user report" appears without his address in it. Close that issue as not
planned, run `npx convex run supportReports:track --prod`, and check that
support tells him it won't be changed.
