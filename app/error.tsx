"use client";

import Link from "next/link";
import { Waveline } from "@/components/Waveline";

/*
  error.tsx обязан быть клиентским: Next вешает на него error boundary, а тот
  живёт только на клиенте. reset() перемонтирует сегмент — если сбой был
  разовым (оборвалась сеть, БД моргнула), страница соберётся со второй попытки
  без полной перезагрузки.

  Текст ошибки пользователю не показываем: в проде Next всё равно заменяет его
  на обезличенный, а на экране он выглядел бы мусором. Разработчику сообщение
  остаётся доступным в консоли и логах сервера.
*/
export default function Error({ reset }: { reset: () => void }) {
  return (
    <div className="flex flex-1 items-center justify-center px-4 py-24">
      <div className="flex max-w-md flex-col items-center gap-5 text-center">
        <Waveline variant="broken" className="h-14 w-52 text-accent/70" />
        <div className="flex flex-col gap-2">
          <h1 className="font-serif text-2xl tracking-tight text-ink">
            Что-то оборвалось
          </h1>
          <p className="text-sm text-muted">
            Страница не собралась. Иногда это разовый сбой.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={reset}
            className="flex h-10 items-center rounded-full bg-accent px-5 text-sm font-medium text-accent-ink transition-opacity hover:opacity-90"
          >
            Попробовать снова
          </button>
          <Link
            href="/"
            className="flex h-10 items-center rounded-full border border-line px-5 text-sm text-ink transition-colors hover:bg-accent-wash"
          >
            На главную
          </Link>
        </div>
      </div>
    </div>
  );
}
