/**
 * Root layout: the app shell every screen renders inside.
 *
 * Owner: Agent 3 (Explorer). Created by Agent 1 as the M0 placeholder (task A1-06).
 * TODO(agent-3): A3-03 adds the bottom bar with the capture button and the main menu.
 */
import type { Metadata, Viewport } from "next";
import Link from "next/link";
import "./globals.css";

/** Page title and description. */
export const metadata: Metadata = {
  title: "Chronodex",
  description: "Collect landmarks, then step back in time and meet a guide from the past.",
};

/** Phone-first viewport. */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

/**
 * Wrap every page with a placeholder header and navigation.
 *
 * @param props - Next.js layout props.
 * @param props.children - The page.
 * @returns The HTML document.
 */
export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <header className="flex items-center justify-between gap-4 border-b-4 border-foreground px-4 py-3">
          <Link href="/" className="font-bold tracking-widest">
            CHRONODEX
          </Link>
          <nav className="flex gap-4 text-sm">
            <Link href="/">Map</Link>
            <Link href="/capture">Capture</Link>
            <Link href="/dex">Dex</Link>
          </nav>
        </header>
        <main className="flex-1 p-4">{children}</main>
      </body>
    </html>
  );
}
