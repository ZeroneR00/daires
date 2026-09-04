import type { Metadata } from "next";
import { Geist, Literata } from "next/font/google";
import { Header } from "@/components/Header";
import { FriendRequestToast } from "@/components/FriendRequestToast";
import { NotificationsProvider } from "@/components/NotificationsProvider";
import { PreviewPlayerProvider } from "@/components/PreviewPlayer";
import { THEME_INIT_SCRIPT } from "@/lib/theme";
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
    // suppressHydrationWarning — точечно на <html> и только из-за data-theme:
    // атрибут ставит инлайн-скрипт до React, и при сверке разметки React
    // увидит расхождение с серверной. Ниже по дереву предупреждения работают
    // как обычно.
    <html
      lang="ru"
      className={`${geistSans.variable} ${literata.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="flex min-h-full flex-col bg-paper text-ink">
        {/*
          Первым делом в теле страницы и синхронно: скрипт красит документ до
          того, как браузер дойдёт до содержимого. Подробности — в lib/theme.ts
        */}
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
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
