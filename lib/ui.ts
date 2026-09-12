/*
  Форма кнопки-«таблетки» живёт сразу в нескольких местах: подписка, дружба и
  «Написать» на дневнике автора, дальше по перекраске — формы и вход. Строка
  классов лежит здесь одна на всех, а не копией в каждом файле: раньше эта
  строка была скопирована в четыре места и уже начала расходиться.

  Файл сознательно ничего не импортирует — это голые константы, поэтому
  одинаково годится и серверным компонентам, и клиентским.
*/

/** Обычное действие: контур на бумаге, акцент проявляется на ховере */
export const pillButton =
  "flex h-9 items-center rounded-full border border-line px-4 text-sm font-medium text-ink transition-colors hover:border-accent/60 hover:text-accent disabled:opacity-60";

/**
 * Состояние, а не действие: «Друзья», «Заявка отправлена». Лёгкая заливка
 * акцентом говорит «связь уже есть» — надпись при этом остаётся тем, что
 * произойдёт по клику, поэтому кнопкам вроде «Отписаться» этот вариант не
 * подходит: подсвеченное действие читалось бы как рекомендованное.
 */
export const pillButtonActive =
  "flex h-9 items-center rounded-full border border-accent/30 bg-accent-wash px-4 text-sm font-medium text-accent transition-colors hover:border-accent/60 disabled:opacity-60";

/** Главное действие блока — залитая акцентом (например «Принять» в паре с «Отклонить») */
export const pillButtonPrimary =
  "flex h-9 items-center rounded-full bg-accent px-4 text-sm font-medium text-accent-ink transition-opacity hover:opacity-90 disabled:opacity-60";

/*
  Поле ввода: одна строка на все формы проекта. Появилась на форме комментария
  в шаге 1 и к заходу B успела понадобиться ещё трижды (текст записи, поиск
  трека, дальше — настройки и вход), поэтому переехала сюда.

  `outline-none` вместе с `focus:border-accent/60` — не отключение фокуса,
  а его замена: рамка теплеет акцентом. Без второго правила первое было бы
  дырой в доступности.
*/
export const field =
  "w-full rounded-card border border-line bg-surface px-3.5 py-2.5 text-sm text-ink outline-none transition-colors placeholder:text-muted focus:border-accent/60";

/**
 * Главное действие формы — во всю ширину и выше «таблетки»: у формы оно
 * ровно одно, и мельчить ему незачем. `pillButtonPrimary` сюда не годится
 * не по смыслу, а по размеру: дописать к нему `h-11 w-full` нельзя —
 * порядок `h-9`/`h-11` в готовом CSS решает Tailwind, а не порядок слов
 * в строке.
 */
export const submitButton =
  "flex h-11 w-full items-center justify-center rounded-full bg-accent px-5 text-sm font-medium text-accent-ink transition-opacity hover:opacity-90 disabled:opacity-50";
