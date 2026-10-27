import type { Metadata } from "next";
import { Archivo, Space_Grotesk } from "next/font/google";
import "./globals.css";
import ChatWidget from "@/components/ChatWidget";
import { TweakPanel } from "@/components/TweakPanel";

const archivo = Archivo({
  subsets: ["latin"],
  variable: "--font-sans",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "Benjamin Levin — AI/ML Engineer & Robotics Generalist",
  description:
    "Co-founder building governed multi-agent platforms. AI/ML, robotics, and quant. Cambridge, MA.",
  metadataBase: new URL("https://benjaminlevin.com"),
  openGraph: {
    title: "Benjamin Levin",
    description: "AI/ML Engineer · Robotics Generalist · Co-Founder",
    url: "https://benjaminlevin.com",
    siteName: "Benjamin Levin",
    type: "website",
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={`${archivo.variable} ${spaceGrotesk.variable}`}>
      <body className="antialiased">
        {children}
        <ChatWidget />
        <TweakPanel />
      </body>
    </html>
  );
}
