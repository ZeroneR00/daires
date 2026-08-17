"use client";

import { usePathname } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { authClient } from "@/lib/auth-client";
import {
  getFriendRequestNotice,
  type FriendRequestNotice,
} from "@/lib/notifications";

const ANNOUNCE_INTERVAL_MS = 60 * 60 * 1000;

interface FriendRequestsValue {
  // Для счётчика в шапке: сколько заявок висит прямо сейчас.
  notice: FriendRequestNotice | null;
  // Для тоста: то же самое, но выставляется только когда пора напомнить.
  announcement: FriendRequestNotice | null;
  refresh: () => void;
}

// Дефолт нужен, чтобы хук не падал вне провайдера (например, если компонент
// когда-нибудь отрендерят в изоляции) — молча отдаём "заявок нет".
const FriendRequestsContext = createContext<FriendRequestsValue>({
  notice: null,
  announcement: null,
  refresh: () => {},
});

export function useFriendRequests(): FriendRequestsValue {
  return useContext(FriendRequestsContext);
}

// Ключ с userId внутри: два аккаунта в одном браузере не должны глушить
// напоминание друг другу.
function storageKey(userId: string) {
  return `music-diary:friend-toast:${userId}`;
}

interface ToastStamp {
  shownAt: number;
  lastCreatedAt: number;
}

// Читаем терпимо: в ключе может лежать мусор, ничего, или голое число из первой
// версии тоста. Любой такой случай — нули, то есть "напомнить при первой же
// возможности".
function readStamp(key: string): ToastStamp {
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(key) ?? "");
    if (parsed && typeof parsed === "object") {
      const stamp = parsed as Partial<ToastStamp>;
      return {
        shownAt: Number(stamp.shownAt) || 0,
        lastCreatedAt: Number(stamp.lastCreatedAt) || 0,
      };
    }
  } catch {
    // невалидный JSON — молча начинаем с нуля
  }
  return { shownAt: 0, lastCreatedAt: 0 };
}

// Два независимых повода напомнить, достаточно любого:
//   1) пришла заявка свежее той, о которой мы уже сообщали;
//   2) заявки те же, но с прошлого показа прошёл час.
// Сравнение по дате, а не по id: если заявок две и свежую отложили кнопкой
// "Позже", самой свежей становится старая — её дата меньше сохранённой, и тост
// не выстреливает повторно сразу после нажатия.
function shouldAnnounce(userId: string, notice: FriendRequestNotice): boolean {
  const key = storageKey(userId);
  const { shownAt, lastCreatedAt } = readStamp(key);

  if (notice.latestCreatedAt <= lastCreatedAt && Date.now() - shownAt < ANNOUNCE_INTERVAL_MS) {
    return false;
  }

  window.localStorage.setItem(
    key,
    JSON.stringify({ shownAt: Date.now(), lastCreatedAt: notice.latestCreatedAt }),
  );
  return true;
}

// Единственный владелец счётчика заявок на клиенте. Держать его здесь, а не в
// SessionStatus, обязательно: revalidatePath из экшена перерисовывает только
// серверные страницы, до клиентской шапки в layout'е он не дотягивается, и
// цифра после "Принять" замерла бы до полной перезагрузки.
//
// Политика показа тоста живёт тоже здесь, а не в самом тосте: решение зависит
// от момента, когда пришли свежие данные, и принимать его в колбэке запроса
// правильнее, чем в эффекте, реагирующем на уже разложенный по state результат.
export function FriendRequestsProvider({ children }: { children: ReactNode }) {
  const { data } = authClient.useSession();
  const userId = data?.user.id;
  const pathname = usePathname();
  const [notice, setNotice] = useState<FriendRequestNotice | null>(null);
  const [announcement, setAnnouncement] = useState<FriendRequestNotice | null>(null);
  const latestRequest = useRef(0);

  const refresh = useCallback(() => {
    // Счётчик гонок: ответы могут прийти не в том порядке, в каком ушли
    // (навигация + мутация подряд), и старый ответ не должен затирать новый.
    const id = ++latestRequest.current;

    // Анонимусу запрос не нужен; выход из сессии обнуляется ниже, при отдаче
    // значения в контекст.
    if (!userId) {
      return;
    }

    getFriendRequestNotice()
      .then((result) => {
        if (id !== latestRequest.current) {
          return;
        }

        setNotice(result);

        if (!result) {
          setAnnouncement(null);
        } else if (shouldAnnounce(userId, result)) {
          setAnnouncement(result);
        }
      })
      // Напоминалка — вещь второстепенная: упавший запрос оставляет прошлое
      // значение и молчит, а не роняет unhandled rejection в консоль.
      .catch(() => {});
  }, [userId]);

  // Монтирование, смена маршрута и вход/выход — все три случая покрывает
  // зависимость от refresh (он завязан на userId) и pathname.
  useEffect(() => {
    refresh();
  }, [refresh, pathname]);

  // Возврат на вкладку: без поллинга это второй (и последний) способ заметить
  // заявку, пришедшую пока вкладка висела открытой.
  useEffect(() => {
    function handleVisibility() {
      if (document.visibilityState === "visible") {
        refresh();
      }
    }

    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [refresh]);

  // Маскируем по userId: после выхода из аккаунта цифра исчезает сразу, не
  // дожидаясь ответа (которого и не будет — запрос для анонимуса не уходит).
  const value = useMemo(
    () => ({
      notice: userId ? notice : null,
      announcement: userId ? announcement : null,
      refresh,
    }),
    [userId, notice, announcement, refresh],
  );

  return (
    <FriendRequestsContext.Provider value={value}>
      {children}
    </FriendRequestsContext.Provider>
  );
}
