import { Waveline } from "@/components/Waveline";

/*
  Первый экран-состояние в проекте. Текста намеренно нет: знак читается сам,
  а подпись «Загрузка…» сделала бы экран дешёвым. Исключение — строка для
  скринридеров: без неё переход для незрячего пользователя выглядит тишиной.

  role="status" + aria-live="polite" — это то, что заставляет вспомогательные
  технологии произнести содержимое, когда блок появляется; sr-only убирает его
  с экрана, не пряча от них (display: none спрятал бы от всех сразу).
*/
export default function Loading() {
  return (
    <div className="flex flex-1 items-center justify-center px-4 py-24">
      <div
        role="status"
        aria-live="polite"
        className="appear-delayed flex flex-col items-center gap-3"
      >
        <Waveline writing className="h-16 w-56 text-accent/70" />
        <span className="sr-only">Загружается</span>
      </div>
    </div>
  );
}
