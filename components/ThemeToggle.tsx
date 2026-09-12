"use client";

import { useSyncExternalStore } from "react";
import {
  DEFAULT_THEME,
  readTheme,
  setTheme,
  THEMES,
  THEME_CHANGE_EVENT,
  type Theme,
} from "@/lib/theme";

/*
  Кнопка-цикл по трём сортам: кофе → кофе с молоком → мокачино → кофе.

  Состояния «как в системе» здесь больше нет. Оно было нужно, пока у сайта был
  светлый вид и тёмный: следовать за системой имеет смысл, когда выбор — про
  освещение вокруг. Сорта кофе про освещение не про что, это просто вкус, и
  спрашивать о нём операционную систему бессмысленно.

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

// На сервере выбора не существует — там всегда сорт по умолчанию. React отрисует
// первый кадр с ним и сразу перерисует кнопку клиентским значением: меняется
// только чашка внутри кнопки, сама страница уже покрашена инлайн-скриптом.
function getServerSnapshot(): Theme {
  return DEFAULT_THEME;
}

const LABELS: Record<Theme, string> = {
  coffee: "Кофе",
  latte: "Кофе с молоком",
  mocha: "Мокачино",
};

const ICONS: Record<Theme, () => React.ReactElement> = {
  coffee: CoffeeIcon,
  latte: LatteIcon,
  mocha: MochaIcon,
};

export function ThemeToggle() {
  const theme = useSyncExternalStore(subscribe, readTheme, getServerSnapshot);
  const next = THEMES[(THEMES.indexOf(theme) + 1) % THEMES.length];
  const Icon = ICONS[theme];

  return (
    <button
      type="button"
      onClick={() => setTheme(next)}
      title={`Тема: ${LABELS[theme].toLowerCase()}`}
      aria-label={`Тема: ${LABELS[theme].toLowerCase()}. Переключить на: ${LABELS[next].toLowerCase()}`}
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-line text-muted transition-colors hover:border-accent hover:text-accent"
    >
      <Icon />
    </button>
  );
}

/*
  Три чашки, и вся разница между ними — сколько в чашке налито. Шутка ровно в
  этом: крепость сорта видна буквально, уровнем кофе, а не подписью. Полная —
  «Кофе», половина — «Кофе с молоком», на самом дне — «Мокачино».

  Чашка у всех трёх один и тот же контур: соседние состояния должны читаться как
  одна вещь в разных стадиях, а не как три разные иконки.

  Поле у знака 20, а не 16 как у соседей по шапке, и чашка занимает его почти
  целиком. Раньше поле было 16, а чашка сидела в двух третях его — рядом с
  лупой (та своё поле выбирает под завязку) знак выглядел заметно мельче
  остальных. Вес линии при этом не поехал: 1.6 в поле 20, отрисованном в 20 px,
  даёт ту же толщину в пикселях, что 1.6 в поле 16 при 16 px.

  Заливка сознательно НЕ доходит до ободка. Первая версия заливала чашку до
  краёв — и полная чашка переставала быть чашкой: заливка сливалась с обводкой
  в сплошную кляксу, силуэт пропадал. Полоска фона под ободком возвращает
  предмету край, и он узнаётся во всех трёх состояниях.

  Дымок есть у всех трёх — он про «кофе», а не про крепость, и делить его между
  сортами было бы не за что. Первая попытка провалилась: две прямые чёрточки
  тем же весом 1.6 читались заячьими ушами. Лечится тремя вещами разом — линия
  волнистая, тоньше основной обводки и разной длины у двух завитков. Тонкая
  линия внутри знака правило «один вес на всю шапку» не ломает: у фирменной
  «Линии» ровно так же нити тоньше всплеска, вес общий — между знаками, а не
  внутри одного.
*/

// Контур чашки: прямые стенки и полукруглое дно (радиус ровно в половину ширины)
const CUP = "M3.9 6.6 H13.3 V11.2 A4.7 4.7 0 0 1 3.9 11.2 Z";
const HANDLE = "M13.5 8.2 A2.2 2.2 0 0 1 13.5 12.2";

// Два завитка: по две полуволны каждый, правый нарочно короче левого
const STEAM = [
  "M7.1 5 q -1.15 -0.95 0 -1.9 q 1.15 -0.95 0 -1.9",
  "M10.3 5 q -1.15 -0.8 0 -1.6 q 1.15 -0.8 0 -1.6",
];

function Cup({ level }: { level: string }) {
  return (
    <svg {...iconProps}>
      <path d={level} fill="currentColor" stroke="none" />
      <path d={CUP} />
      <path d={HANDLE} />
      {STEAM.map((d) => (
        <path key={d} d={d} strokeWidth={1.15} />
      ))}
    </svg>
  );
}

// Кофе: полная чашка — крепче некуда
function CoffeeIcon() {
  return <Cup level="M4.7 8.4 H12.5 V11.2 A3.9 3.9 0 0 1 4.7 11.2 Z" />;
}

// Кофе с молоком: ровно половина, уровень совпадает с началом дна
function LatteIcon() {
  return <Cup level="M4.7 11.2 H12.5 A3.9 3.9 0 0 1 4.7 11.2 Z" />;
}

/*
  Мокачино: кофе на самом дне. Уровень обрывается дугой самой чашки, а не
  прямой линией: на высоте 13.3 стенок уже нет, там дно, и прямой отрезок
  вылез бы за контур.
*/
function MochaIcon() {
  return <Cup level="M5.31 13.3 A3.9 3.9 0 0 0 11.89 13.3 Z" />;
}

const iconProps = {
  width: 20,
  height: 20,
  viewBox: "0 0 20 20",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};
