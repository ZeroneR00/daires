"use client";

import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Groove } from "@/components/Groove";
import { Waveline } from "@/components/Waveline";
import { pillButton } from "@/lib/ui";

/*
  Хвост ленты: подгрузка следующих записей и знак в самом конце.

  Форма выбрана не «чистый автоскролл», а кнопка плюс наблюдатель на ней же.
  Один элемент, две роли: мышью и пальцем она срабатывает сама на подходе к
  низу, а клавиатуре и выключенному JS остаётся честной кнопкой. Чистый
  автоскролл для второй половины людей означал бы «лента кончается на десятой
  записи».

  Знак в конце показывается только когда `nextCursor` стал `null` — то есть
  когда записи правда кончились. Раньше он стоял под лентой всегда, но с
  подгрузкой это была бы уже неправда: «конец» под первой порцией из десяти.
*/

/*
  Тип описан здесь, у потребителя, а не в файле экшена: из `"use server"`
  наружу разрешены только async-функции (Next пропускает и экспорт типа — они
  стираются, — но на это лучше не опираться). Экшены совпадают с этой формой
  структурно, чего TypeScript достаточно.
*/
interface FeedChunk {
  /** Готовые карточки: их отрисовал сервер, клиент только вставляет */
  nodes: ReactNode;
  nextCursor: string | null;
  /** Сколько записей на странице станет — продолжает чередование знака */
  nextIndex: number;
}

interface FeedLoaderProps {
  /** `null` — сервер отдал всю ленту сразу, подгружать нечего */
  initialCursor: string | null;
  /** Сколько записей уже отрисовано страницей */
  initialIndex: number;
  loadMore: (cursor: string, startIndex: number) => Promise<FeedChunk>;
}

/* С запасом в пол-экрана: порция успевает приехать до того, как в неё упрутся */
const PRELOAD_MARGIN = "600px";

export function FeedLoader({
  initialCursor,
  initialIndex,
  loadMore,
}: FeedLoaderProps) {
  const [chunks, setChunks] = useState<{ key: string; nodes: ReactNode }[]>([]);
  const [cursor, setCursor] = useState(initialCursor);
  const [index, setIndex] = useState(initialIndex);
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  /*
    Замок отдельно от `pending` и именно в ref: наблюдатель может выстрелить
    дважды до того, как React применит `setPending`, и тогда одна и та же
    порция уедет в список двумя копиями. Ref меняется синхронно.
  */
  const busy = useRef(false);

  const load = useCallback(() => {
    if (busy.current || cursor === null) return;

    busy.current = true;
    setPending(true);
    setFailed(false);

    loadMore(cursor, index)
      .then((chunk) => {
        setChunks((prev) => [...prev, { key: cursor, nodes: chunk.nodes }]);
        setCursor(chunk.nextCursor);
        setIndex(chunk.nextIndex);
      })
      .catch(() => setFailed(true))
      .finally(() => {
        busy.current = false;
        setPending(false);
      });
  }, [cursor, index, loadMore]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    /*
      После ошибки наблюдатель не вешается: сорванная сеть (у автора она бывает
      норовистая) иначе превратилась бы в бесконечный цикл запросов, пока
      элемент виден. Возврат — только руками, кнопкой «Ещё раз».
    */
    if (!sentinel || cursor === null || failed) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) load();
      },
      { rootMargin: PRELOAD_MARGIN },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [cursor, failed, load]);

  return (
    <>
      {chunks.map((chunk) => (
        <Fragment key={chunk.key}>{chunk.nodes}</Fragment>
      ))}

      {cursor === null ? (
        /* Знак закрывает ленту: «записи кончились», а не обрыв в пустоту */
        <Groove className="pt-4" />
      ) : (
        <div ref={sentinelRef} className="flex flex-col items-center gap-2 pt-4">
          {pending ? (
            /*
              Знак в изводе «письмо» — тот же, что на `app/loading.tsx`: ждать
              подгрузку и ждать страницу это одно и то же состояние, и второго
              спиннера сайту не нужно.
            */
            <Waveline writing className="h-8 w-28 text-accent/70" />
          ) : (
            <button type="button" onClick={load} className={pillButton}>
              {failed ? "Ещё раз" : "Ещё"}
            </button>
          )}

          {failed && (
            <p className="text-sm text-muted">Не получилось загрузить дальше</p>
          )}

          {/*
            Для скринридера подгрузка иначе выглядит тишиной: список молча
            вырос. `role="status"` заставляет проговорить смену текста.
          */}
          <span role="status" aria-live="polite" className="sr-only">
            {pending ? "Загружаются записи" : ""}
          </span>
        </div>
      )}
    </>
  );
}
