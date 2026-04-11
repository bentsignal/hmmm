import reactHooks from "eslint-plugin-react-hooks";

const eslintConfig = [
  {
    ignores: [
      ".tanstack/**",
      ".output/**",
      ".vinxi/**",
      "dist/**",
      "src/routeTree.gen.ts",
    ],
  },
  {
    plugins: {
      "react-hooks": reactHooks,
    },
    rules: {
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "off",
    },
  },
];

export default eslintConfig;
