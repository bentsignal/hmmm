# AGENTS.md

Guidance for coding agents working in `/Users/shawn/dev/projects/start-faster`.

## Repository Summary

- Turborepo monorepo.
- This project is very early on. Don't hestitate to make breaking changes. It has not yet been deployed to any users, so don't worry about things like migrations.

## Required Validation After Changes

At the end of every run, run the following commands in order:

1. `pnpm run lint`
2. `pnpm run typecheck`

If all of these succeed, run:

4. `pnpm run format:fix`

Then summarize changes for the user.
