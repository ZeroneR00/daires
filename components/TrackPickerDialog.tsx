"use client";

import { useEffect, useRef, useState } from "react";
import { searchTracksAction } from "@/app/new/actions";
import { TrackRow } from "@/components/TrackRow";
import { field, pillButton, pillButtonActive } from "@/lib/ui";
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
      className="m-auto w-full max-w-lg rounded-card border border-line bg-surface p-0 backdrop:bg-ink/40 backdrop:backdrop-blur-sm"
    >
      <div className="flex max-h-[80vh] flex-col gap-4 p-6">
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

        <div className="flex flex-col gap-2 overflow-y-auto">
          {isSearching && (
            <p className="text-sm text-muted">Ищем…</p>
          )}
          {!isSearching && query.trim() && results.length === 0 && !error && (
            <p className="text-sm text-muted">Ничего не найдено</p>
          )}
          {results.map((track) => {
            const alreadyAdded = selectedExternalIds.has(track.externalId);
            return (
              <div key={track.externalId} className="flex items-center gap-2">
                <div className="min-w-0 flex-1">
                  <TrackRow track={track} />
                </div>
                <button
                  type="button"
                  disabled={alreadyAdded}
                  onClick={() => onSelectTrack(track)}
                  className={`${alreadyAdded ? pillButtonActive : pillButton} shrink-0 disabled:cursor-not-allowed`}
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
