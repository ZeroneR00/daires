"use client";

import { usePreviewPlayer } from "@/components/PreviewPlayer";

/*
  «Линия» — фирменный знак сайта: ровная нить, короткий затухающий всплеск,
  снова ровная нить. Три отдельных пути, а не один: ровные части нарисованы
  тоньше и цветом рамок, всплеск — толще и currentColor (цвет задаётся классом
  на месте вызова), и главное — его можно масштабировать анимацией, не трогая
  нить (концы всплеска лежат ровно на осевой, при scaleY стыки не двигаются).

  Пропорция зашита в viewBox, так что размер на месте задаётся одним классом.
  Шаг между пиками 4.5 единицы: теснее — и на реальных 25–30 px всплеск
  слипается в кляксу.

  variant="micro" — отдельная геометрия для мест размером с букву (маркер
  трека в карточке). Не уменьшенная копия: у большого знака двенадцать изломов,
  на 28 пикселях они схлопнулись бы в грязь, поэтому у мелкого их четыре.
*/

const SHAPES = {
  full: {
    viewBox: "0 0 96 28",
    flats: ["M0 14H20", "M69 14H96"],
    burst:
      "M20 14 24.5 8.5 29 19.5 33.5 5 38 23 42.5 9.5 47 18 51.5 11.5 56 15.5 60.5 13 65 14.5 69 14",
    // Длина штриха для «прорисовки»; посчитана по сегментам, с запасом вверх
    length: 110,
    width: 2,
  },
  micro: {
    viewBox: "0 0 28 16",
    flats: [],
    burst: "M0 8 5 8 8 3 11 13.5 14 2 17 14 20 6 23 9.5 26 8 28 8",
    length: 45,
    width: 1.6,
  },
} as const;

interface WavelineProps {
  className?: string;
  variant?: keyof typeof SHAPES;
}

export function Waveline({ className = "", variant = "full" }: WavelineProps) {
  // Знак живёт на весь сайт: играет превью где угодно на странице — дышит.
  const { playingId } = usePreviewPlayer();
  const shape = SHAPES[variant];

  return (
    <svg
      aria-hidden
      viewBox={shape.viewBox}
      fill="none"
      className={`${playingId ? "waveline--live" : ""} ${className}`}
      // Длина штриха уезжает в CSS переменной: «прорисовка» — одно правило
      // на оба размера, а не два почти одинаковых набора keyframes.
      style={{ "--stroke-len": shape.length } as React.CSSProperties}
    >
      {shape.flats.map((d) => (
        <path key={d} d={d} stroke="var(--line)" strokeWidth={1.5} />
      ))}
      <path
        className="waveline__burst"
        d={shape.burst}
        stroke="currentColor"
        strokeWidth={shape.width}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
