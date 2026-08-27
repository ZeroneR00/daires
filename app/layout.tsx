import type { Metadata } from "next";
import { Geist, Literata } from "next/font/google";
import { Header } from "@/components/Header";
import { FriendRequestToast } from "@/components/FriendRequestToast";
import { NotificationsProvider } from "@/components/NotificationsProvider";
import { PreviewPlayerProvider } from "@/components/PreviewPlayer";
import "./globals.css";

// subsets обязаны включать cyrillic: без него next/font не кладёт
// кириллические глифы в подгружаемый файл и русский текст уезжает
// в системный фолбэк — шрифт вроде подключён, а на экране не он.
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin", "cyrillic"],
});

// Антиква для текста записей: Literata нарисована для длинного чтения.
const literata = Literata({
  variable: "--font-literata",
  subsets: ["latin", "cyrillic"],
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
      className={`${geistSans.variable} ${literata.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-paper text-ink">
        <NotificationsProvider>
          <PreviewPlayerProvider>
          <Header />
          {children}
          <FriendRequestToast />
          </PreviewPlayerProvider>
        </NotificationsProvider>
      </body>
    </html>
  );
}
