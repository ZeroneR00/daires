"use client";

import { useState, useTransition } from "react";
import { TrackPickerDialog } from "@/components/TrackPickerDialog";
import { TrackRow } from "@/components/TrackRow";
import { field, pillButton, submitButton } from "@/lib/ui";
import type { NormalizedTrack } from "@/lib/track-api";
import { MAX_TRACKS_PER_POST, type PostInput } from "@/lib/post-schema";

/*
  Текст записи набирается той же антиквой, которой его потом читают на
  странице записи: пишешь ровно то, что получится. `prose-diary` задаёт свой
  размер шрифта и перебивает `text-sm` из `field` — обычная CSS-специфичность
  плюс порядок слоёв: утилиты Tailwind лежат в `@layer utilities`, а правила
  из `globals.css` вне слоёв, и потому сильнее.
*/
const diaryTextareaClassName = `${field} prose-diary min-h-40 resize-y`;

const EMPTY_FORM_ERROR = "Добавь текст или хотя бы один трек";

interface PostFormProps {
  initialText?: string;
  initialTracks?: NormalizedTrack[];
  action: (input: PostInput) => Promise<{ error: string } | undefined>;
  submitLabel: string;
  pendingLabel: string;
}

export function PostForm({
  initialText = "",
  initialTracks = [],
  action,
  submitLabel,
  pendingLabel,
}: PostFormProps) {
  const [text, setText] = useState(initialText);
  const [selectedTracks, setSelectedTracks] = useState<NormalizedTrack[]>(initialTracks);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const selectedExternalIds = new Set(selectedTracks.map((t) => t.externalId));
  const isEmpty = !text.trim() && selectedTracks.length === 0;

  function handleSelectTrack(track: NormalizedTrack) {
    setSelectedTracks((prev) => {
      if (prev.some((t) => t.externalId === track.externalId)) return prev;
      if (prev.length >= MAX_TRACKS_PER_POST) return prev;
      return [...prev, track];
    });
  }

  function handleRemoveTrack(externalId: string) {
    setSelectedTracks((prev) => prev.filter((t) => t.externalId !== externalId));
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (isEmpty) {
      setError(EMPTY_FORM_ERROR);
      return;
    }

    startTransition(async () => {
      const result = await action({ text, tracks: selectedTracks });
      if (result?.error) setError(result.error);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <label htmlFor="text" className="text-sm font-medium text-ink">
          Текст записи
        </label>
        <textarea
          id="text"
          rows={8}
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder="О чём этот трек, что он для тебя значит…"
          className={diaryTextareaClassName}
        />
      </div>

      <div className="flex flex-col gap-2.5">
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm font-medium text-ink">
            Треки{" "}
            <span className="font-normal text-muted">
              {selectedTracks.length} / {MAX_TRACKS_PER_POST}
            </span>
          </span>
          <button
            type="button"
            onClick={() => setIsDialogOpen(true)}
            disabled={selectedTracks.length >= MAX_TRACKS_PER_POST}
            className={pillButton}
          >
            Добавить трек
          </button>
        </div>

        {selectedTracks.length === 0 ? (
          <p className="text-sm text-muted">Треки ещё не добавлены</p>
        ) : (
          /*
            TrackRow вместо самодельного <li> — побочный выигрыш ради
            которого это и делается: выбранное наконец можно послушать,
            не публикуя запись. "Убрать" — сестра строки, а не потомок:
            та же композиция, что в пикере (TrackRow + кнопка снаружи).
          */
          <ul className="flex flex-col gap-2">
            {selectedTracks.map((track) => (
              <li key={track.externalId} className="flex items-center gap-2">
                <div className="min-w-0 flex-1">
                  <TrackRow track={track} trackId={track.externalId} />
                </div>
                <button
                  type="button"
                  onClick={() => handleRemoveTrack(track.externalId)}
                  className={`${pillButton} shrink-0`}
                >
                  Убрать
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}

      <button type="submit" disabled={isPending || isEmpty} className={submitButton}>
        {isPending ? pendingLabel : submitLabel}
      </button>

      <TrackPickerDialog
        open={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        selectedExternalIds={selectedExternalIds}
        onSelectTrack={handleSelectTrack}
        remainingSlots={MAX_TRACKS_PER_POST - selectedTracks.length}
      />
    </form>
  );
}
