// Jest runs the render budgets in perf/, and Reassure's measurements with
// `pnpm perf` from the repo root (see perf/README.md). Unit tests elsewhere
// run on node:test.
module.exports = {
  preset: "jest-expo/ios",
  testMatch: ["<rootDir>/perf/**/*.perf.{ts,tsx}"],
  // Reassure renders each scenario eleven times.
  testTimeout: 60_000,
  setupFiles: ["<rootDir>/perf/setup.ts"],
  // Worklets' own resolver, which swaps its native module for a JS one.
  resolver: "react-native-worklets/jest/resolver",
  moduleNameMapper: { "^~/(.*)$": "<rootDir>/src/$1" },
  // The React Compiler runs as it does in the app (Metro turns it on with
  // `experiments.reactCompiler`), so render counts are the app's.
  transform: {
    "\\.[jt]sx?$": [
      "babel-jest",
      {
        caller: { name: "metro", bundler: "metro", platform: "ios" },
        plugins: [["babel-plugin-react-compiler", {}]],
        presets: ["babel-preset-expo"],
      },
    ],
  },
  transformIgnorePatterns: [
    "node_modules/(?!(\\.pnpm|(jest-)?react-native|@react-native|expo|@expo|react-navigation|@react-navigation|@decentralized-convex|@vera|@legendapp|uniwind|@tanstack))",
  ],
};
