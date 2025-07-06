import { ThemeProvider } from "next-themes";
import { ClerkProvider } from "@clerk/nextjs";
import { dark } from "@clerk/themes";
import ConvexClientProvider from "./convex-provider";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider appearance={{ baseTheme: dark }} afterSignOutUrl="/">
      <ConvexClientProvider>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
          {children}
        </ThemeProvider>
      </ConvexClientProvider>
    </ClerkProvider>
  );
}
