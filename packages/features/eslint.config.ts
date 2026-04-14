import { defineConfig } from "eslint/config";

import { baseConfig, strictConfig } from "@acme/eslint-config/base";
import { reactConfig } from "@acme/eslint-config/react";
import { createStrictSyntax } from "@acme/eslint-config/syntax";

export default defineConfig(
  {
    // The messages/agent/ subtree is the inlined source of
    // `@convex-dev/agent/react` v0.6.1 (see plan:
    // lovely-coalescing-lighthouse). It's library code we own but didn't
    // author, so the project's strict syntax rules don't apply.
    ignores: ["dist/**", "src/messages/agent/**/"],
  },
  baseConfig,
  strictConfig,
  reactConfig,
  createStrictSyntax({ ts: true, react: true }),
);
