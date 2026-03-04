import type { Metadata } from "next";
import { Cormorant_Garamond, Space_Mono, Plus_Jakarta_Sans } from "next/font/google";
import FeedbackWidget from "@/components/feedback/FeedbackWidget";
import GlobalNav from "@/components/layout/GlobalNav";
import "./globals.css";

const display = Cormorant_Garamond({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const body = Plus_Jakarta_Sans({
  variable: "--font-body",
  subsets: ["latin"],
});

const mono = Space_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "700"],
});

export const metadata: Metadata = {
  title: "Timeshare Connect",
  description: "Timeshare marketplace MVP",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${display.variable} ${body.variable} ${mono.variable} antialiased`}
      >
        <GlobalNav />
        {children}
        <FeedbackWidget />
      </body>
    </html>
  );
}
