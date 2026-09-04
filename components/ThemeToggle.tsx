"use client";

import { useSyncExternalStore } from "react";
import {
  readTheme,
  setTheme,
  THEMES,
  THEME_CHANGE_EVENT,
  type Theme,
} from "@/lib/theme";

/*
  Кнопка-цикл: как в системе → светлая → тёмная → как в системе.

  Три состояния, а не два: сайт по умолчанию следует системной настройке, и
  если оставить только «светлая/тёмная», первый же клик отвязывает его от
  системы навсегда — вернуться будет некуда.

  Состояние компонент не хранит, а **читает** из localStorage через
  `useSyncExternalStore`. Так решаются разом три вещи: нет `setState` в
  эффекте (на него ругается ESLint и он даёт лишний каскад ререндеров),
  выбор подхватывается в соседних вкладках, и у React есть честный
  серверный снимок. Тот же приём, что у `useMounted` в `SessionStatus`.
*/

function subscribe(onStoreChange: () => void) {
  // `storage` — про чужие вкладки, свой кастомный эвент — про эту
  window.addEventListener("storage", onStoreChange);
  window.addEventListener(THEME_CHANGE_EVENT, onStoreChange);
  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener(THEME_CHANGE_EVENT, onStoreChange);
  };
}

// На сервере выбора не существует — там всегда «как в системе». React отрисует
// первый кадр с этим значением и сразу перерисует кнопку клиентским: меняется
// только иконка внутри кнопки, сама страница уже покрашена инлайн-скриптом.
function getServerSnapshot(): Theme {
  return "system";
}

const LABELS: Record<Theme, string> = {
  system: "Тема: как в системе",
  light: "Тема: светлая",
  dark: "Тема: тёмная",
};

export function ThemeToggle() {
  const theme = useSyncExternalStore(subscribe, readTheme, getServerSnapshot);
  const next = THEMES[(THEMES.indexOf(theme) + 1) % THEMES.length];

  return (
    <button
      type="button"
      onClick={() => setTheme(next)}
      title={LABELS[theme]}
      aria-label={`${LABELS[theme]}. Переключить на: ${LABELS[next].toLowerCase()}`}
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-line text-muted transition-colors hover:border-accent hover:text-accent"
    >
      {theme === "system" && <SystemIcon />}
      {theme === "light" && <SunIcon />}
      {theme === "dark" && <MoonIcon />}
    </button>
  );
}

/*
  Иконки местные, как `MenuIcon` в `MobileMenu`: 16 px, обводка 1.6 —
  один вес линии на всю шапку. Фирменный знак сюда сознательно не берётся:
  у него уже три роли, четвёртая превратила бы подпись в узор.
*/

function SunIcon() {
  return (
    <svg {...iconProps}>
      <circle cx="8" cy="8" r="3.1" />
      <path d="M8 1.4v1.4M8 13.2v1.4M1.4 8h1.4M13.2 8h1.4M3.3 3.3l1 1M11.7 11.7l1 1M12.7 3.3l-1 1M4.3 11.7l-1 1" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg {...iconProps}>
      <path d="M13.2 9.6A5.6 5.6 0 0 1 6.4 2.8a5.6 5.6 0 1 0 6.8 6.8Z" />
    </svg>
  );
}

// «Как в системе» — круг, залитый обводкой наполовину: и не солнце, и не луна
function SystemIcon() {
  return (
    <svg {...iconProps}>
      <circle cx="8" cy="8" r="5.6" />
      <path d="M8 2.4a5.6 5.6 0 0 1 0 11.2Z" fill="currentColor" />
    </svg>
  );
}

const iconProps = {
  width: 16,
  height: 16,
  viewBox: "0 0 16 16",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};
