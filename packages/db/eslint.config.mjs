import convexPlugin from "@convex-dev/eslint-plugin";
import { defineConfig } from "eslint/config";

export default defineConfig(
  {
    ignores: ["src/_generated/**"],
  },
  ...convexPlugin.configs.recommended,
);
