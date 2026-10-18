import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ProScheduler Demo",
  description: "Professional React calendar with drag-drop, timezone, i18n, and resources",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
