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
import { getNotices, type FriendRequestNotice } from "@/lib/notifications";
import { getBrowserSupabase } from "@/lib/supabase-browser";
import { PING_EVENT, userChannelTopic } from "@/lib/realtime-channel";

const ANNOUNCE_INTERVAL_MS = 60 * 60 * 1000;

interface NotificationsValue {
  // Для счётчика заявок в шапке: сколько заявок висит прямо сейчас.
  friendRequests: FriendRequestNotice | null;
  // Для счётчика сообщений в шапке.
  unreadMessages: number;
  // Для тоста: те же заявки, но выставляется только когда пора напомнить.
  announcement: FriendRequestNotice | null;
  // Момент последнего Realtime-пинга. Страница диалога вешает на него эффект и
  // перезапрашивает себя — сам пинг пустой, содержимое приезжает обычным путём.
  lastPingAt: number;
  refresh: () => void;
}

// Дефолт нужен, чтобы хук не падал вне провайдера (например, если компонент
// когда-нибудь отрендерят в изоляции) — молча отдаём "уведомлений нет".
const NotificationsContext = createContext<NotificationsValue>({
  friendRequests: null,
  unreadMessages: 0,
  announcement: null,
  lastPingAt: 0,
  refresh: () => {},
});

export function useNotifications(): NotificationsValue {
  return useContext(NotificationsContext);
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
//
// Политика осталась ровно про заявки: тост про сообщения не показываем — они и
// так видны цифрой в шапке, а всплывашка на каждое сообщение мешала бы.
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

// Единственный владелец клиентских уведомлений (заявки в друзья + непрочитанные
// сообщения). Держать их здесь, а не в SessionStatus, обязательно:
// revalidatePath из экшена перерисовывает только серверные страницы, до
// клиентской шапки в layout'е он не дотягивается, и цифра после "Принять"
// замерла бы до полной перезагрузки.
//
// Политика показа тоста живёт тоже здесь, а не в самом тосте: решение зависит
// от момента, когда пришли свежие данные, и принимать его в колбэке запроса
// правильнее, чем в эффекте, реагирующем на уже разложенный по state результат.
export function NotificationsProvider({ children }: { children: ReactNode }) {
  const { data } = authClient.useSession();
  const userId = data?.user.id;
  const pathname = usePathname();
  const [friendRequests, setFriendRequests] = useState<FriendRequestNotice | null>(null);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [announcement, setAnnouncement] = useState<FriendRequestNotice | null>(null);
  const [lastPingAt, setLastPingAt] = useState(0);
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

    getNotices()
      .then((result) => {
        if (id !== latestRequest.current) {
          return;
        }

        setFriendRequests(result.friendRequests);
        setUnreadMessages(result.unreadMessages);

        if (!result.friendRequests) {
          setAnnouncement(null);
        } else if (shouldAnnounce(userId, result.friendRequests)) {
          setAnnouncement(result.friendRequests);
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

  // Возврат на вкладку: без поллинга это способ заметить заявку, пришедшую пока
  // вкладка висела открытой (у сообщений для этого есть Realtime-пинг ниже, у
  // заявок — нет, они шлются без него).
  useEffect(() => {
    function handleVisibility() {
      if (document.visibilityState === "visible") {
        refresh();
      }
    }

    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [refresh]);

  // Realtime-"звонок". Канал публичный и пустой: в payload нет ни текста, ни
  // отправителя — приватные каналы авторизуются Supabase-JWT, которого у нас
  // нет (сессия в Better Auth). Пинг лишь говорит "сходи перечитай", а
  // содержимое приезжает обычным Server Action'ом с сессионной кукой.
  useEffect(() => {
    if (!userId) {
      return;
    }

    const client = getBrowserSupabase();
    if (!client) {
      // Ключи не настроены — живой доставки просто нет, всё остальное работает.
      return;
    }

    const channel = client
      .channel(userChannelTopic(userId))
      .on("broadcast", { event: PING_EVENT }, () => {
        // Два независимых потребителя: цифра в шапке (refresh) и открытая
        // страница диалога (lastPingAt в контексте).
        setLastPingAt(Date.now());
        refresh();
      })
      .subscribe();

    return () => {
      void client.removeChannel(channel);
    };
  }, [userId, refresh]);

  // Маскируем по userId: после выхода из аккаунта цифры исчезают сразу, не
  // дожидаясь ответа (которого и не будет — запрос для анонимуса не уходит).
  const value = useMemo(
    () => ({
      friendRequests: userId ? friendRequests : null,
      unreadMessages: userId ? unreadMessages : 0,
      announcement: userId ? announcement : null,
      lastPingAt,
      refresh,
    }),
    [userId, friendRequests, unreadMessages, announcement, lastPingAt, refresh],
  );

  return (
    <NotificationsContext.Provider value={value}>
      {children}
    </NotificationsContext.Provider>
  );
}
