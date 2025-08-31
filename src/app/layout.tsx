import type { Metadata } from "next";
import { Inter, Roboto_Mono } from "next/font/google";
import "./globals.css";
import Providers from "@/providers";
import { Toaster } from "sonner";

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
  title: "QBE",
  description: "How can I help you today?",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
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
        className={`${inter.variable} ${robotoMono.variable} font-main relative overflow-hidden antialiased`}
      >
        <Stars />
        <Providers>{children}</Providers>
        <Toaster />
      </body>
    </html>
  );
}

const Stars = () => {
  return (
    <div className="pointer-events-none absolute inset-0 h-screen w-screen">
      {Array.from({ length: 200 }).map((_, index) => (
        <div
          className={`bg-foreground absolute h-[1px] w-[1px]`}
          key={index}
          style={{
            left: `calc(100vw * ${Math.random()} + 20px)`,
            top: `calc(100vh * ${Math.random()} + 20px)`,
            opacity: Math.random(),
          }}
        />
      ))}
    </div>
  );
};
