/*
  Тема: «как в системе» (по умолчанию), светлая или тёмная явно.

  Файл намеренно без единого импорта — по образцу `lib/ui.ts` и
  `lib/realtime-channel.ts`: его тянет и клиентский компонент-переключатель,
  и серверный `app/layout.tsx`, который вставляет отсюда строку скрипта.

  Правило одно: атрибут `data-theme` на <html> ставится **только** при явном
  выборе. «Как в системе» — это его отсутствие, а не третье значение: тогда
  тему решает медиа-запрос в `app/globals.css`, и ничего специально
  переключать не нужно.
*/

export type Theme = "system" | "light" | "dark";

export const THEMES: readonly Theme[] = ["system", "light", "dark"];

export const THEME_STORAGE_KEY = "music-diary:theme";

/*
  Своё событие: `storage` браузер шлёт только в *другие* вкладки, в той,
  где произошла запись, он молчит. Без этого кнопка не узнала бы о своём же
  клике — переключатель подписан на хранилище, а не хранит состояние сам.
*/
export const THEME_CHANGE_EVENT = "music-diary:theme-change";

export function readTheme(): Theme {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    return stored === "light" || stored === "dark" ? stored : "system";
  } catch {
    // Приватный режим и запрет на хранилище — «как в системе», это рабочий исход
    return "system";
  }
}

export function setTheme(theme: Theme) {
  const root = document.documentElement;

  if (theme === "system") {
    root.removeAttribute("data-theme");
  } else {
    root.dataset.theme = theme;
  }

  try {
    if (theme === "system") {
      localStorage.removeItem(THEME_STORAGE_KEY);
    } else {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    }
  } catch {
    // Выбор не переживёт перезагрузку, но текущая страница уже перекрасилась
  }

  window.dispatchEvent(new Event(THEME_CHANGE_EVENT));
}

/*
  Скрипт против вспышки чужой темы.

  Сервер не знает выбор человека — тот лежит в localStorage, — поэтому в
  разметке, приезжающей с сервера, атрибута нет и первый кадр рисуется по
  системной настройке. Поставить атрибут из эффекта поздно: React выполнит
  его уже после отрисовки, и выбравший светлую при тёмной системе увидит
  чёрную вспышку на каждой загрузке.

  Лечится синхронным инлайн-скриптом в самом начале <body>: браузер
  выполняет его до того, как дойдёт до содержимого страницы и что-либо
  нарисует. `next/script` со стратегией beforeInteractive сюда не подходит —
  по документации он отрисовку не блокирует.

  Минифицирован руками и обёрнут в try/catch: это единственный код проекта,
  который выполняется вне React, и упасть он права не имеет.
*/
export const THEME_INIT_SCRIPT = `try{var t=localStorage.getItem(${JSON.stringify(
  THEME_STORAGE_KEY,
)});if(t==="light"||t==="dark")document.documentElement.dataset.theme=t}catch(e){}`;
