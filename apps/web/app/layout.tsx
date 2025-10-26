import "./globals.css";
import "../server/db";
import type { Metadata } from "next";
import { Cinzel } from "next/font/google";
import { EB_Garamond } from "next/font/google";
import { Inter } from "next/font/google";

const display = Cinzel({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-display"
});

const editorial = EB_Garamond({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-serif"
});

const sans = Inter({
  subsets: ["latin"],
  variable: "--font-sans"
});

export const metadata: Metadata = {
  title: "Tarot Daily",
  description: "Deterministic tarot readings with nightly prompt optimization."
};

export default function RootLayout(props: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body
        className={[
          sans.variable,
          editorial.variable,
          display.variable,
          "min-h-screen bg-ash-950 text-parchment-50 antialiased"
        ].join(" ")}
      >
        {props.children}
      </body>
    </html>
  );
}
