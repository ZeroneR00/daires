import type { MetadataRoute } from "next";

/*
  Манифест приложения. Файловая конвенция App Router: Next сам отдаст его по
  адресу /manifest.webmanifest и пропишет <link rel="manifest"> в <head>.

  Что он даёт и чего НЕ даёт, чтобы не ждать лишнего:
  — даёт «Установить на главный экран»: сайт открывается своим окном, без
    адресной строки, со своей иконкой в списке приложений;
  — НЕ даёт офлайн — за это отвечает service worker, которого в проекте нет;
  — НЕ пускает в App Store / Google Play, это остаётся обычный сайт.

  Иконки — растр в public/, а не app/icon.svg: SVG в манифесте принимают не
  все системы, а Android для установки хочет 192 и 512 пикселей. Отдельная
  maskable-версия обязательна, потому что Android режет иконку под свою форму
  (круг, сквиркл): у неё фон во всю площадь и знак ужат к центру, иначе
  всплеск обрезало бы по краям.
*/
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "music·diary — музыкальный дневник",
    short_name: "music·diary",
    description:
      "Личный музыкальный дневник: запись, трек и пара слов о том, что он с тобой сделал.",
    lang: "ru",
    start_url: "/",
    display: "standalone",
    // Цвет бумаги, а не акцента: приложение должно выглядеть тетрадью
    // (с недавних пор — залитой кофе, отсюда коричневый),
    // и им же красится системная полоса статуса на Android.
    background_color: "#2a1e17",
    theme_color: "#2a1e17",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
