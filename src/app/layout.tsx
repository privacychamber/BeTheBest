import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "BeTheBest | Internal Bidding & Business Development Platform",
  description:
    "Production-grade internal business development, qualification scoring, Upwork connects allocation, and contract delivery platform.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-[#060913] text-slate-100 antialiased selection:bg-cyan-500/30 selection:text-cyan-200">
        {children}
      </body>
    </html>
  );
}
