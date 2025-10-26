import type { Metadata } from "next";
import "./globals.css";
import "../server/db";

export const metadata: Metadata = {
  title: "Tarot Daily",
  description: "Deterministic tarot readings with nightly prompt optimization."
};

export default function RootLayout(props: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-950 text-slate-100 antialiased">
        {props.children}
      </body>
    </html>
  );
}
