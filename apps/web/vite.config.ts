import { devtools } from "@tanstack/devtools-vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import tailwindcss from "@tailwindcss/vite";
import viteReact from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig(async ({ mode }) => {
  const { env } = await import("./src/env");

  return {
    server: {
      host: true,
      port: 3100,
    },
    plugins: [
      devtools({}),
      tailwindcss(),
      tsconfigPaths(),
      tanstackStart({
        srcDirectory: "src",
        router: { routesDirectory: "app" },
      }),
      viteReact({
        babel: {
          plugins: ["babel-plugin-react-compiler"],
        },
      }),
      nitro(),
    ],
  };
});
