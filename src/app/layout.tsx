import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
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
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="fr"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full`}
    >
      <body className="h-full antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
