// Which app versions this backend still works with. The backend serves it
// as a live query, and the app compiles in the value from when it was
// built (`@vera/backend/breaking-version`). When a deploy raises it, every
// open app built with a lower one covers the screen with "Updating Vera…"
// and restarts into its update (see apps/mobile/src/features/updates).
//
// Raise it by one in the PR whose backend change breaks the app before it:
// a removed or renamed function, an argument or result old apps can't
// handle. Most changes should stay compatible instead (new fields
// optional, old requests still accepted), and don't raise it. Ship a raise
// with `pnpm release ota production "<notes>" --with-backend`, which
// publishes the update seconds after the deploy (docs/releasing.md).

export const BREAKING_VERSION = 2;
