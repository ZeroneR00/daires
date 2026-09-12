"use client";

import { useEffect, useRef, useState } from "react";
import { searchTracksAction, topTracksAction } from "@/app/new/actions";
import { TrackRow } from "@/components/TrackRow";
import { field, pillButton, pillButtonActive } from "@/lib/ui";
import type { NormalizedTrack } from "@/lib/track-api";

interface TrackPickerDialogProps {
  open: boolean;
  onClose: () => void;
  selectedExternalIds: Set<string>;
  onSelectTrack: (track: NormalizedTrack) => void;
  /** Сколько ещё треков можно добавить. На нуле кнопки гаснут. */
  remainingSlots: number;
}

const DEBOUNCE_MS = 400;

const sectionLabel = "text-xs font-semibold uppercase tracking-widest text-muted";

export function TrackPickerDialog({
  open,
  onClose,
  selectedExternalIds,
  onSelectTrack,
  remainingSlots,
}: TrackPickerDialogProps) {
  const isFull = remainingSlots <= 0;
  const dialogRef = useRef<HTMLDialogElement>(null);
  const requestIdRef = useRef(0);
  const debounceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<NormalizedTrack[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [topTracks, setTopTracks] = useState<NormalizedTrack[]>([]);
  const [topStatus, setTopStatus] = useState<"idle" | "loading" | "ready" | "error">(
    "idle",
  );
  const topRequestedRef = useRef(false);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  /*
    Чарт грузим по первому открытию, а не при монтировании: <dialog> лежит
    в разметке всегда, и качать чарт тому, кто пикер даже не откроет, — два
    лишних запроса к Apple на каждый заход на форму. Флаг в ref, а не в
    состоянии: он ничего не рисует, а перезапрос при повторном открытии
    смысла не имеет — чарт меняется раз в сутки.
  */
  useEffect(() => {
    if (!open || topRequestedRef.current) return;
    topRequestedRef.current = true;
    setTopStatus("loading");
    topTracksAction()
      .then((tracks) => {
        setTopTracks(tracks);
        setTopStatus("ready");
      })
      .catch(() => setTopStatus("error"));
  }, [open]);

  // Debounce lives in the change handler (not an effect keyed on `query`) —
  // triggering setState from an effect body is discouraged in React 19,
  // and reacting to user input is exactly what event handlers are for.
  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current);
    };
  }, []);

  function handleQueryChange(value: string) {
    setQuery(value);

    if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current);

    const trimmed = value.trim();
    if (!trimmed) {
      setResults([]);
      setIsSearching(false);
      setError(null);
      return;
    }

    setIsSearching(true);
    const requestId = ++requestIdRef.current;
    debounceTimeoutRef.current = setTimeout(() => {
      searchTracksAction(trimmed)
        .then((tracks) => {
          if (requestIdRef.current !== requestId) return;
          setResults(tracks);
          setError(null);
        })
        .catch(() => {
          if (requestIdRef.current !== requestId) return;
          setError("Не удалось выполнить поиск, попробуй ещё раз");
        })
        .finally(() => {
          if (requestIdRef.current !== requestId) return;
          setIsSearching(false);
        });
    }, DEBOUNCE_MS);
  }

  /*
    Одна строка на оба списка: чарт и выдача поиска отличаются только
    источником и номером позиции. Разведи их по двум кускам разметки — и
    «Уже добавлено» однажды починят в одном месте из двух.
  */
  function renderTrack(track: NormalizedTrack, position?: number) {
    const alreadyAdded = selectedExternalIds.has(track.externalId);
    const disabled = alreadyAdded || isFull;
    return (
      <div key={track.externalId} className="flex items-center gap-2">
        <div className="min-w-0 flex-1">
          <TrackRow track={track} trackId={track.externalId} index={position} />
          {/* Помечаем немой трек здесь же — иначе его добавляют
              вслепую и узнают об отсутствии превью только в записи */}
          {!track.previewUrl && (
            <p className="mt-1 text-xs text-muted">Без превью</p>
          )}
        </div>
        {/*
          На узком экране кнопка сжимается до круга со знаком, а подпись
          возвращается с `sm`. Причина не в красоте: «Добавить» текстом — это
          ~110 px, и в модалке на телефоне от названия трека оставалось две
          буквы с многоточием. Круг ровно того же размера, что «play» рядом,
          так что строка читается как пара «послушать / взять».

          Сужение записано `max-sm:`, а не парой `px-0 sm:px-4`, и это не
          вкусовщина: базовую `px-4` из `pillButton` другой базовой `px-0`
          не перебить — порядок в готовом CSS решает Tailwind, ровно как
          с парой h-9/h-11 в lib/ui.ts. Пойманное живьём: padding оставался
          32 px из 36, и <svg> внутри сжимался до 2 px ширины — кнопка
          выглядела кружком с точкой. Варианты с медиазапросом Tailwind
          кладёт после базовых утилит, поэтому `max-sm:px-0` выигрывает.
        */}
        <button
          type="button"
          disabled={disabled}
          onClick={() => onSelectTrack(track)}
          aria-label={alreadyAdded ? "Уже добавлено" : "Добавить трек"}
          title={alreadyAdded ? "Уже добавлено" : "Добавить трек"}
          className={`${alreadyAdded ? pillButtonActive : pillButton} shrink-0 disabled:cursor-not-allowed max-sm:w-9 max-sm:justify-center max-sm:px-0`}
        >
          <svg
            aria-hidden
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-4 w-4 shrink-0 sm:hidden"
          >
            {alreadyAdded ? <path d="M4 12.5 9.5 18 20 6" /> : <path d="M12 5v14M5 12h14" />}
          </svg>
          <span className="hidden sm:inline">
            {alreadyAdded ? "Уже добавлено" : "Добавить"}
          </span>
        </button>
      </div>
    );
  }

  // Пустое поле — не пустой пикер: пока не набрали запрос, место занимает
  // чарт. Порог — сам запрос, а не наличие выдачи: иначе чарт мигал бы
  // между вводом и ответом поиска.
  const showChart = query.trim() === "";

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      className="m-auto w-full max-w-lg rounded-card border border-line bg-surface p-0 backdrop:bg-ink/40 backdrop:backdrop-blur-sm"
    >
      {/* Поля уже на телефоне: 24 px с каждой стороны — это 48 px, отнятых
          у названия трека там, где его и так едва видно */}
      <div className="flex max-h-[80vh] flex-col gap-4 p-4 sm:p-6">
        <div className="flex items-center justify-between">
          <h2 className="font-serif text-lg tracking-tight text-ink">
            Найти трек
          </h2>
          <button
            type="button"
            onClick={onClose}
            className={pillButton}
          >
            Готово
          </button>
        </div>

        <input
          type="text"
          value={query}
          onChange={(event) => handleQueryChange(event.target.value)}
          placeholder="Название трека или исполнитель"
          className={field}
          autoFocus
        />

        {error && <p className="text-sm text-danger">{error}</p>}
        {isFull && (
          <p className="text-sm text-muted">
            Достигнут предел — 20 треков
          </p>
        )}

        <div className="flex flex-col gap-2 overflow-y-auto">
          {showChart ? (
            <>
              <p className={sectionLabel}>Сегодня слушают</p>
              {topStatus === "loading" && (
                <p className="text-sm text-muted">Загружаем чарт…</p>
              )}
              {/*
                Тихой подписью, а не `text-danger`: красный в проекте
                означает «твоё действие не прошло», а чарт никто не
                запрашивал — поиск при этом полностью работает.
              */}
              {topStatus === "error" && (
                <p className="text-sm text-muted">
                  Чарт сейчас недоступен — найди трек по названию
                </p>
              )}
              {topStatus === "ready" &&
                topTracks.map((track, index) => renderTrack(track, index + 1))}
            </>
          ) : (
            <>
              {isSearching && <p className="text-sm text-muted">Ищем…</p>}
              {!isSearching && results.length === 0 && !error && (
                <p className="text-sm text-muted">Ничего не найдено</p>
              )}
              {results.map((track) => renderTrack(track))}
            </>
          )}
        </div>
      </div>
    </dialog>
  );
}
