import { ourFileRouter } from "@/app/api/uploadthing/core";
import { ClerkProvider } from "@clerk/nextjs";
import { dark } from "@clerk/themes";
import { NextSSRPlugin } from "@uploadthing/react/next-ssr-plugin";
import { extractRouterConfig } from "uploadthing/server";
import ConvexClientProvider from "./convex-provider";
import ThemeProvider from "./theme-provider";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider appearance={{ baseTheme: dark }} afterSignOutUrl="/">
      <ConvexClientProvider>
        <ThemeProvider>
          <NextSSRPlugin routerConfig={extractRouterConfig(ourFileRouter)} />
          {children}
        </ThemeProvider>
      </ConvexClientProvider>
    </ClerkProvider>
  );
}
