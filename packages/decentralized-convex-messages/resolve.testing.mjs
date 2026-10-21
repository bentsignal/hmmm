// Tests only: lets `node --test` load modules that import Convex's
// generated code (`./_generated/api.js`, which is TypeScript here), such as
// mutations that schedule work. The second dot in its name keeps Convex
// from bundling it as a module.
import { registerHooks } from "node:module";

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (/\/_generated\/[^/]+\.js$/.test(specifier)) {
      return nextResolve(specifier.replace(/\.js$/, ".ts"), context);
    }
    return nextResolve(specifier, context);
  },
});
