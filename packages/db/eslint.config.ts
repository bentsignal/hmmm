import convexPlugin from "@convex-dev/eslint-plugin";
import { defineConfig } from "eslint/config";

import { baseConfig, strictConfig } from "@acme/eslint-config/base";
import { createStrictSyntax } from "@acme/eslint-config/syntax";

export default defineConfig(
  {
    // The agent/ subtree is the inlined source of `@convex-dev/agent` v0.6.1
    // (see plan: lovely-coalescing-lighthouse). It's library code we own but
    // didn't author, so the project's strict syntax rules (max-lines,
    // function declarations, return-type rules, etc.) don't apply. It is
    // still typechecked by tsc.
    ignores: ["src/_generated/**/", "src/agent/**/"],
  },
  baseConfig,
  strictConfig,
  createStrictSyntax({ ts: true }),
  ...convexPlugin.configs.recommended,
);
