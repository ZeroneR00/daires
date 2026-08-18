import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Header } from "@/components/Header";
import { FriendRequestToast } from "@/components/FriendRequestToast";
import { FriendRequestsProvider } from "@/components/FriendRequestsProvider";
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
  title: "music-diary",
  description: "Платформа-блог для музыкальных дневников",
  alternates: {
    types: { "application/rss+xml": "/rss.xml" },
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="ru"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <FriendRequestsProvider>
          <Header />
          {children}
          <FriendRequestToast />
        </FriendRequestsProvider>
      </body>
    </html>
  );
}
