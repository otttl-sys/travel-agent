import type { Metadata } from "next";
import { Geist, Inter, Instrument_Serif } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import "./globals.css";

const geist = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const instrumentSerif = Instrument_Serif({
  variable: "--font-instrument-serif",
  subsets: ["latin"],
  weight: ["400"],
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://vagamundo.io"),
  title: "Vagamundo — Your AI Travel Planner",
  description: "Describe your dream trip. Our AI agents plan everything for you.",
  openGraph: {
    title: "Vagamundo — Your AI Travel Planner",
    description: "Describe your dream trip. Our AI agents plan everything for you.",
    url: "https://vagamundo.io",
    siteName: "Vagamundo",
  },
  manifest: "/manifest.json",
  themeColor: "#1a1a1a",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Vagamundo",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geist.variable} ${inter.variable} ${instrumentSerif.variable} h-full antialiased`} suppressHydrationWarning>
      <body className="min-h-full flex flex-col">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
