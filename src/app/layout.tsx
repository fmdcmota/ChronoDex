/**
 * Root layout: the app shell every screen renders inside.
 *
 * Owner: Agent 3 (Explorer). Implements MASTER.md task A3-03. Each screen is a full-viewport
 * phone page, so this shell is minimal: the document plus global CSS, MapLibre's CSS and the
 * pixel font. The map screen positions itself with `position: fixed`, so no header or bottom
 * bar lives here.
 *
 * maplibre-gl.css and @fontsource/jersey-10 are global CSS, and Next.js only allows global CSS
 * from the root layout, so both are imported here (never from a component).
 */
import type { Metadata, Viewport } from "next";
import "maplibre-gl/dist/maplibre-gl.css";
import "@fontsource/jersey-10/400.css";
import "./globals.css";

/**
 * True when the screens serve fixtures instead of the real API. Shown as a fixed "Mock data" tag
 * because a whole phone-test round once took canned chat replies for real ones. The variable is
 * inlined at build or dev-server start, so changing it needs a restart.
 */
const MOCKS_ON = process.env.NEXT_PUBLIC_USE_MOCKS === "1";

/** Page title and description. */
export const metadata: Metadata = {
  title: "Chronodex",
  description: "Collect landmarks, then step back in time and meet a guide from the past.",
  // Installable web app (MASTER.md task A3-08): the manifest and icons are in public/.
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  // iOS ignores most of the manifest, so "Add to Home Screen" is told here.
  appleWebApp: { capable: true, title: "Chronodex", statusBarStyle: "black-translucent" },
};

/** Phone-first viewport, sized to the safe area so the map fills the screen edge to edge. */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  // Colours the browser bar to match the app (the ink colour in globals.css).
  themeColor: "#1e1a2b",
};

/**
 * Wrap every page in the document shell.
 *
 * @param props - Next.js layout props.
 * @param props.children - The page.
 * @returns The HTML document.
 */
export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="h-full">
        {children}
        {MOCKS_ON ? (
          <div className="mock-tag" role="status">
            Mock data
          </div>
        ) : null}
      </body>
    </html>
  );
}
