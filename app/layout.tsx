import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import FeedbackWidget from "@/components/feedback/FeedbackWidget";
import GlobalNav from "@/components/layout/GlobalNav";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
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
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <GlobalNav />
        {children}
        <FeedbackWidget />
      </body>
    </html>
  );
}
