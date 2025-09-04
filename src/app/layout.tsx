import type { Metadata } from "next";
import { Inter, Roboto_Mono } from "next/font/google";
import "./globals.css";
import Providers from "@/providers";
import { cookies } from "next/headers";
import { Toaster } from "sonner";
import { defaultTheme, getThemeClass, Theme } from "@/lib/theme";

const inter = Inter({
  variable: "--font-inter",
  weight: "variable",
  subsets: ["latin"],
});

const robotoMono = Roboto_Mono({
  variable: "--font-roboto-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "hmmm...",
  description: "How can I help you today?",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const initialTheme =
    ((await cookies()).get("theme")?.value as Theme) || defaultTheme;
  const themeClass = getThemeClass(initialTheme);
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className="dark"
      style={{ colorScheme: "dark" }}
    >
      <head>
        {/* REACT SCAN */}
        {/* <script
          crossOrigin="anonymous"
          src="//unpkg.com/react-scan/dist/auto.global.js"
        /> */}
      </head>
      <body
        className={`${inter.variable} ${robotoMono.variable} ${themeClass} font-main relative overflow-hidden antialiased`}
      >
        <Providers>{children}</Providers>
        <Toaster />
      </body>
    </html>
  );
}
