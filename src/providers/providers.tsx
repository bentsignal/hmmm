import { ourFileRouter } from "@/app/api/uploadthing/core";
import { ClerkProvider } from "@clerk/nextjs";
import { dark } from "@clerk/themes";
import { NextSSRPlugin } from "@uploadthing/react/next-ssr-plugin";
import { ThemeProvider } from "next-themes";
import { extractRouterConfig } from "uploadthing/server";
import ConvexClientProvider from "./convex-provider";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider appearance={{ baseTheme: dark }} afterSignOutUrl="/">
      <ConvexClientProvider>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
          <NextSSRPlugin routerConfig={extractRouterConfig(ourFileRouter)} />
          {children}
        </ThemeProvider>
      </ConvexClientProvider>
    </ClerkProvider>
  );
}
