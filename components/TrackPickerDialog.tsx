"use client";

import { useEffect, useRef, useState } from "react";
import { searchTracksAction } from "@/app/new/actions";
import type { NormalizedTrack } from "@/lib/track-api";

interface TrackPickerDialogProps {
  open: boolean;
  onClose: () => void;
  selectedExternalIds: Set<string>;
  onSelectTrack: (track: NormalizedTrack) => void;
}

const DEBOUNCE_MS = 400;

export function TrackPickerDialog({
  open,
  onClose,
  selectedExternalIds,
  onSelectTrack,
}: TrackPickerDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const requestIdRef = useRef(0);
  const debounceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<NormalizedTrack[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
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

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      className="m-auto w-full max-w-lg rounded-2xl border border-black/[.08] bg-white p-0 backdrop:bg-black/40 dark:border-white/[.145] dark:bg-zinc-900"
    >
      <div className="flex max-h-[80vh] flex-col gap-4 p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-black dark:text-zinc-50">
            Найти трек
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-black/[.08] px-3 py-1 text-sm text-black dark:border-white/[.145] dark:text-zinc-50"
          >
            Готово
          </button>
        </div>

        <input
          type="text"
          value={query}
          onChange={(event) => handleQueryChange(event.target.value)}
          placeholder="Название трека или исполнитель"
          className="w-full rounded-lg border border-black/[.08] bg-transparent px-3 py-2 text-sm text-black outline-none focus:border-black/[.3] dark:border-white/[.145] dark:text-zinc-50"
          autoFocus
        />

        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

        <div className="flex flex-col gap-2 overflow-y-auto">
          {isSearching && (
            <p className="text-sm text-zinc-500 dark:text-zinc-400">Ищем…</p>
          )}
          {!isSearching && query.trim() && results.length === 0 && !error && (
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Ничего не найдено
            </p>
          )}
          {results.map((track) => {
            const alreadyAdded = selectedExternalIds.has(track.externalId);
            return (
              <div
                key={track.externalId}
                className="flex items-center gap-3 rounded-lg border border-black/[.08] p-2 dark:border-white/[.145]"
              >
                {track.artworkUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={track.artworkUrl}
                    alt=""
                    className="h-10 w-10 shrink-0 rounded"
                  />
                ) : (
                  <div className="h-10 w-10 shrink-0 rounded bg-zinc-200 dark:bg-zinc-800" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-black dark:text-zinc-50">
                    {track.title}
                  </p>
                  <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">
                    {track.artist}
                    {track.album ? ` — ${track.album}` : ""}
                  </p>
                  {track.previewUrl && (
                    <audio
                      controls
                      preload="none"
                      src={track.previewUrl}
                      className="mt-1 h-8 w-full"
                    />
                  )}
                </div>
                <button
                  type="button"
                  disabled={alreadyAdded}
                  onClick={() => onSelectTrack(track)}
                  className="shrink-0 rounded-full border border-black/[.08] px-3 py-1 text-xs font-medium text-black transition-colors hover:bg-black/[.04] disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/[.145] dark:text-zinc-50 dark:hover:bg-[#1a1a1a]"
                >
                  {alreadyAdded ? "Уже добавлено" : "Добавить"}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </dialog>
  );
}
