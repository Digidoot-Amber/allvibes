import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "all vibes",
  description: "A collaborative interactive space that is all vibes.",
  // Not for search engines — robots.txt blocks crawlers too.
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: { index: false, follow: false },
  },
};

export const viewport: Viewport = {
  themeColor: "#ffffff",
  // The world handles its own zooming; stop the page zooming underneath it.
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full">
      <body className="h-full antialiased">{children}</body>
    </html>
  );
}
