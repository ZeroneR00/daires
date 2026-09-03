"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { QueueTrack } from "@/lib/track-queue";

/*
  Один <audio> на всю вкладку, а не по элементу на каждую обложку: иначе два
  превью заиграли бы хором, и гасить чужой звук пришлось бы вручную. Провайдер
  держит id того, что звучит сейчас, — этого хватает и кнопке, и анимации винила.

  Запись играет альбомом: доиграло превью — само пошло следующее. Очередь и
  позиция живут в useRef, а не в state, — их читают только обработчики событий
  <audio>, навешенные один раз в эффекте с пустым списком зависимостей. Ref
  там не протухает, а лишний ререндер провайдер себе позволить не может: он
  обёрнут вокруг всего дерева в app/layout.tsx.

  Прогресс по той же причине идёт мимо React: `timeupdate` стреляет ~4 раза в
  секунду, и вести его через setState значило бы перерисовывать страницу ради
  полоски. Провайдер рассылает долю проигранного подписчикам, а подписана
  ровно одна строка — та, что сейчас звучит, — и пишет CSS-переменную себе
  через ref. Тот же приём, что уже применён к вращению пластинки.
*/

type ProgressListener = (ratio: number) => void;

interface PreviewPlayerValue {
  playingId: string | null;
  /** Одиночное превью (поиск, пикер трека) — очередь из одного элемента. */
  toggle: (id: string, url: string) => void;
  /** Запись целиком: играть с `startIndex` и дальше по списку. */
  playQueue: (queue: QueueTrack[], startIndex?: number) => void;
  subscribeProgress: (listener: ProgressListener) => () => void;
}

const PreviewPlayerContext = createContext<PreviewPlayerValue>({
  playingId: null,
  toggle: () => {},
  playQueue: () => {},
  subscribeProgress: () => () => {},
});

export function usePreviewPlayer(): PreviewPlayerValue {
  return useContext(PreviewPlayerContext);
}

export function PreviewPlayerProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);

  const queueRef = useRef<QueueTrack[]>([]);
  const indexRef = useRef(-1);
  /*
    Смена audio.src во время игры запускает media load algorithm, а он сам
    ставит paused = true и шлёт событие `pause` — то самое, на котором висит
    «погасить подсветку». При автопереходе вышла бы гонка «погасили / зажгли»:
    подсветка мигала бы на каждой смене дорожки. Флаг говорит обработчику,
    что эта пауза наша, программная, и состояние трогать не нужно.
  */
  const suppressPauseRef = useRef(false);
  // Зеркало playingId: обработчики и колбэки читают его, не попадая в зависимости.
  const playingIdRef = useRef<string | null>(null);
  const progressListeners = useRef(new Set<ProgressListener>());

  const setPlaying = useCallback((id: string | null) => {
    playingIdRef.current = id;
    setPlayingId(id);
  }, []);

  const emitProgress = useCallback((ratio: number) => {
    for (const listener of progressListeners.current) listener(ratio);
  }, []);

  const subscribeProgress = useCallback((listener: ProgressListener) => {
    const listeners = progressListeners.current;
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  const clearQueue = useCallback(() => {
    queueRef.current = [];
    indexRef.current = -1;
    setPlaying(null);
    emitProgress(0);
  }, [emitProgress, setPlaying]);

  const playAt = useCallback(
    (index: number) => {
      const audio = audioRef.current;
      const item = queueRef.current[index];
      if (!audio || !item) {
        clearQueue();
        return;
      }

      indexRef.current = index;
      suppressPauseRef.current = true;
      audio.src = item.previewUrl;
      audio.currentTime = 0;
      emitProgress(0);
      // Подсветку зажигаем явно, а не ожиданием события: play() отклоняется,
      // если браузер запретил звук, — тогда «крутится, но тишина» не случится.
      audio
        .play()
        .then(() => {
          suppressPauseRef.current = false;
          setPlaying(item.id);
        })
        .catch(() => {
          suppressPauseRef.current = false;
          setPlaying(null);
        });
    },
    [clearQueue, emitProgress, setPlaying],
  );

  const stopPlayback = useCallback(() => {
    audioRef.current?.pause();
    clearQueue();
  }, [clearQueue]);

  useEffect(() => {
    // new Audio() только в эффекте — на сервере window нет.
    const audio = new Audio();
    audio.preload = "none";
    audioRef.current = audio;

    const advance = () => {
      const next = indexRef.current + 1;
      if (next < queueRef.current.length) playAt(next);
      else clearQueue();
    };

    const onPause = () => {
      if (suppressPauseRef.current) return;
      setPlaying(null);
      emitProgress(0);
    };

    const onTimeUpdate = () => {
      const { duration, currentTime } = audio;
      emitProgress(
        Number.isFinite(duration) && duration > 0 ? currentTime / duration : 0,
      );
    };

    // Битое превью не должно обрывать альбом — с ошибки уходим так же, как с конца.
    audio.addEventListener("ended", advance);
    audio.addEventListener("error", advance);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("timeupdate", onTimeUpdate);

    return () => {
      audio.removeEventListener("ended", advance);
      audio.removeEventListener("error", advance);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.pause();
      audioRef.current = null;
    };
  }, [clearQueue, emitProgress, playAt, setPlaying]);

  const playQueue = useCallback(
    (queue: QueueTrack[], startIndex = 0) => {
      const item = queue[startIndex];
      if (!item) return;
      if (playingIdRef.current === item.id) {
        stopPlayback();
        return;
      }
      queueRef.current = queue;
      playAt(startIndex);
    },
    [playAt, stopPlayback],
  );

  const toggle = useCallback(
    (id: string, url: string) => {
      playQueue([{ id, previewUrl: url }]);
    },
    [playQueue],
  );

  const value = useMemo(
    () => ({ playingId, toggle, playQueue, subscribeProgress }),
    [playingId, toggle, playQueue, subscribeProgress],
  );

  return (
    <PreviewPlayerContext.Provider value={value}>
      {children}
    </PreviewPlayerContext.Provider>
  );
}
