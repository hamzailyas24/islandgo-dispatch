import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "IslandGo Dispatch — Prototype",
  description: "IslandCab booking and dispatch proof-of-concept for IslandGo.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/* Loaded via a stylesheet link (not next/font) so production
            builds never depend on reaching Google Fonts at build time —
            only the visitor's browser fetches these, same as any normal
            web font. */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
