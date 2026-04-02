import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LunchBox AI",
  description: "Generate lunchbox-friendly meal ideas with Claude.",
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
