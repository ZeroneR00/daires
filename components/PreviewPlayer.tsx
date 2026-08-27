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

/*
  Один <audio> на всю вкладку, а не по элементу на каждую обложку: иначе два
  превью заиграли бы хором, и гасить чужой звук пришлось бы вручную. Провайдер
  держит id того, что звучит сейчас, — этого хватает и кнопке, и анимации винила.

  Прогресс сознательно не считаем: `timeupdate` дёргал бы setState несколько раз
  в секунду, а провайдер обёрнут вокруг всего дерева — перерисовывалась бы вся
  страница ради полоски. Индикатор «играет» — само вращение пластинки, оно
  крутится чистым CSS и React про него ничего не знает.
*/

interface PreviewPlayerValue {
  playingId: string | null;
  toggle: (id: string, url: string) => void;
}

const PreviewPlayerContext = createContext<PreviewPlayerValue>({
  playingId: null,
  toggle: () => {},
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

  useEffect(() => {
    // new Audio() только в эффекте — на сервере window нет.
    const audio = new Audio();
    audio.preload = "none";
    audioRef.current = audio;

    const stop = () => setPlayingId(null);
    audio.addEventListener("ended", stop);
    audio.addEventListener("error", stop);
    audio.addEventListener("pause", stop);

    return () => {
      audio.removeEventListener("ended", stop);
      audio.removeEventListener("error", stop);
      audio.removeEventListener("pause", stop);
      audio.pause();
      audioRef.current = null;
    };
  }, []);

  const toggle = useCallback(
    (id: string, url: string) => {
      const audio = audioRef.current;
      if (!audio) return;

      if (playingId === id) {
        audio.pause();
        return;
      }

      audio.src = url;
      audio.currentTime = 0;
      // play() возвращает промис и отклоняется, если браузер запретил звук.
      // Тогда просто не зажигаем состояние — вместо «крутится, но тишина».
      audio
        .play()
        .then(() => setPlayingId(id))
        .catch(() => setPlayingId(null));
    },
    [playingId],
  );

  const value = useMemo(() => ({ playingId, toggle }), [playingId, toggle]);

  return (
    <PreviewPlayerContext.Provider value={value}>
      {children}
    </PreviewPlayerContext.Provider>
  );
}
