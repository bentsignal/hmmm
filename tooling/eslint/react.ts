import reactPlugin from "eslint-plugin-react";
import reactCompiler from "eslint-plugin-react-compiler";
import reactHooks from "eslint-plugin-react-hooks";
import { defineConfig } from "eslint/config";

export const reactConfig = defineConfig(
  {
    files: ["**/*.ts", "**/*.tsx"],
    ...reactPlugin.configs.flat.recommended,
    ...reactPlugin.configs.flat["jsx-runtime"],
    ...reactCompiler.configs.recommended,
    plugins: {
      ...reactPlugin.configs.flat.recommended?.plugins,
      ...reactPlugin.configs.flat["jsx-runtime"]?.plugins,
      ...reactCompiler.configs.recommended.plugins,
    },
    languageOptions: {
      ...reactPlugin.configs.flat.recommended?.languageOptions,
      ...reactPlugin.configs.flat["jsx-runtime"]?.languageOptions,
      globals: {
        React: "writable",
      },
    },
    rules: {
      "react-compiler/react-compiler": "error",
      "react/no-unstable-nested-components": ["error", { allowAsProps: true }],
    },
  },
  reactHooks.configs.flat["recommended-latest"]!,
);
