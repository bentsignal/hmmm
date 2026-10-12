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

## From PR #97: open sign-up

Sign-up no longer takes an invite code, so the "Apple App Review" code that
the TestFlight review notes give Apple's reviewers no longer means anything.

### 1. Take the invite code out of the review notes

**When:** after the production backend deploy, before submitting a build to
Beta App Review (or the App Store).

Read the TestFlight Test Information notes, remove the invite code and any
instructions about entering it, and say that reviewers create their own
account by choosing a username:

```sh
pnpm release asc GET /v1/apps/6818656155/betaAppReviewDetail
pnpm release asc PATCH /v1/betaAppReviewDetails/<id> \
  '{"data":{"type":"betaAppReviewDetails","id":"<id>","attributes":{"notes":"<new notes>"}}}'
```

If an App Store version has review notes (`appStoreReviewDetails`), fix
those the same way.

**Verify:** the GET shows the new notes with no invite code.
