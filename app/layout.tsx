import type { Metadata } from "next";
import { Geist, Literata } from "next/font/google";
import { Header } from "@/components/Header";
import { FriendRequestToast } from "@/components/FriendRequestToast";
import { NotificationsProvider } from "@/components/NotificationsProvider";
import { PreviewPlayerProvider } from "@/components/PreviewPlayer";
import { THEME_INIT_SCRIPT } from "@/lib/theme";
import { SITE_LOCALE, SITE_NAME, SITE_URL } from "@/lib/site";
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
  /*
    Без metadataBase относительный путь к картинке в openGraph так и остаётся
    относительным, а мессенджер или соцсеть, которые тянут превью со стороны,
    развернуть его не могут — картинки просто не будет.
  */
  metadataBase: new URL(SITE_URL),
  title: {
    // Заголовок самой главной страницы и запасной для тех, кто своего
    // не объявил.
    default: "music·diary — музыкальный дневник",
    /*
      Шаблон дописывает хвост к заголовкам дочерних страниц, поэтому они
      отдают только свою часть («Имя автора», «12 сентября»). Раньше хвост
      писали руками в трёх местах — при переименовании сайта их пришлось бы
      искать по всему дереву.
    */
    template: "%s — music·diary",
  },
  // Та же строка, что в app/manifest.ts: это описание сайта, а не описание
  // установленного приложения, и расходиться им не с чего.
  description:
    "Личный музыкальный дневник: запись, трек и пара слов о том, что он с тобой сделал.",
  alternates: {
    types: { "application/rss+xml": "/rss.xml" },
  },
  /*
    Значения по умолчанию для карточки ссылки. Заголовок и описание Next
    подставит сюда сам из полей выше, а страница записи переопределит их
    своими — вместе со своей обложкой.
  */
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    locale: SITE_LOCALE,
    url: SITE_URL,
  },
  twitter: { card: "summary_large_image" },
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
