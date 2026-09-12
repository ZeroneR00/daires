/*
  Общий словарь очереди: им пользуются и серверные компоненты (PostCard,
  страница записи — они собирают очередь и отдают её пропом), и клиентские
  (PreviewPlayer, PostTrackList — они по ней играют). Поэтому файл, как
  lib/ui.ts и lib/realtime-channel.ts, сознательно не импортирует ничего:
  через любой импорт сюда могла бы приехать серверная зависимость.
*/

/** Минимум, который нужен плееру: что играть и чем это подсветить. */
export interface QueueTrack {
  id: string;
  previewUrl: string;
}

/** Сколько строк списка дорожек видно до раскрытия. */
export const VISIBLE_TRACKS = 5;

/*
  Свой минимальный тип входа вместо импорта модели Prisma — тот же приём,
  что у пропов UserResultRow: функции нужны два поля, а не вся связка.
*/
interface QueueSource {
  track: { id: string; previewUrl: string | null };
}

/**
 * Очередь записи в порядке дорожек. Треки без превью отбрасываются: очередь
 * не должна спотыкаться о немой трек — «доиграло и пошло дальше» сломалось бы
 * на первом же таком. В списке они при этом остаются видимыми, просто с
 * погашенной кнопкой.
 *
 * Порядок берётся из входного массива: он уже отсортирован по `position`
 * в `postWithDetails` (lib/posts.ts).
 */
export function buildQueue(postTracks: readonly QueueSource[]): QueueTrack[] {
  const queue: QueueTrack[] = [];
  for (const { track } of postTracks) {
    if (track.previewUrl) {
      queue.push({ id: track.id, previewUrl: track.previewUrl });
    }
  }
  return queue;
}
