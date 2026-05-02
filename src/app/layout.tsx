import type { Metadata } from "next";
import Script from "next/script";
import { DM_Sans, JetBrains_Mono, Pixelify_Sans } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";

const dmSans = DM_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

const pixelifySans = Pixelify_Sans({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "fy — Votre assistant IA",
  description:
    "fy est un assistant IA conçu pour les Malgaches. Recherche web, vidéos, textes, voix et images.",
  keywords: ["IA", "Madagascar", "Malagasy", "assistant", "intelligence artificielle"],
  openGraph: {
    title: "fy — Votre assistant IA",
    description: "Intelligence artificielle conçue par des Malgaches, pour les Malgaches.",
    type: "website",
  },
  icons: {
    icon: "/fy-favicon.png",
    apple: "/fy-favicon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="fr"
      suppressHydrationWarning
      className={`${dmSans.variable} ${jetbrainsMono.variable} ${pixelifySans.variable} h-full`}
    >
      <body className="h-full antialiased">
        <Script src="/theme-init.js" strategy="beforeInteractive" />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
