import { ImageResponse } from "next/og";

/*
  Картинка для карточки ссылки: то, что разворачивается, когда адрес сайта
  кидают в чат. Файловая конвенция Next — модуль отдаётся по служебному
  адресу, а в <head> сам собой уезжает <meta property="og:image">.

  Рисуется не браузером, а отдельным движком (Satori внутри next/og),
  который переводит JSX сразу в картинку. Из этого следуют два ограничения,
  на которые натыкаются все: доступно лишь подмножество CSS (flex есть,
  grid нет, каждому контейнеру нужен явный display), и шрифты сайта сюда
  не долетают — next/font кладёт их для браузера, а этот движок о них
  не знает.

  Размер 1200×630 — не произвол, а то, что ждут и Telegram, и остальные:
  при другой пропорции карточку обрежут по своему усмотрению.
*/

export const alt = "music·diary — музыкальный дневник";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const PAPER = "#2a1e17";
const INK = "#f2e6d6";
const MUTED = "#b9a493";
const ACCENT = "#e8895d";
const LINE = "#47342a";

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: PAPER,
          color: INK,
          // Тетрадная линовка, как на самом сайте: повторяющийся градиент,
          // без единого ассета.
          backgroundImage: `repeating-linear-gradient(to bottom, transparent 0px, transparent 43px, rgba(242,230,214,0.055) 43px, rgba(242,230,214,0.055) 44px)`,
        }}
      >
        {/* Фирменный знак: ровная нить, короткий всплеск, снова нить */}
        <svg width="288" height="84" viewBox="0 0 96 28" fill="none">
          <path d="M0 14H20" stroke={LINE} strokeWidth={2} />
          <path d="M69 14H96" stroke={LINE} strokeWidth={2} />
          <path
            d="M20 14 24.5 8.5 29 19.5 33.5 5 38 23 42.5 9.5 47 18 51.5 11.5 56 15.5 60.5 13 65 14.5 69 14"
            stroke={ACCENT}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>

        <div style={{ display: "flex", fontSize: 84, marginTop: 24, letterSpacing: "-0.02em" }}>
          music
          <span style={{ color: ACCENT }}>·</span>
          diary
        </div>

        <div style={{ display: "flex", fontSize: 34, color: MUTED, marginTop: 20 }}>
          Дневник, который слушают
        </div>
      </div>
    ),
    size,
  );
}
