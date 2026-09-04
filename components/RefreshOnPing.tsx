"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useNotifications } from "@/components/NotificationsProvider";

// Клиентский "нерв" для серверных страниц про сообщения. Сам пинг из Realtime
// пустой — он лишь говорит "что-то пришло"; router.refresh() перезапрашивает
// текущую серверную страницу обычным путём, то есть с сессионной кукой, и уже
// оттуда приезжает содержимое. Ровно этим схема "звонок, а не транспорт" и
// отличается от передачи текста через публичный канал.
//
// Ничего не рендерит: это чистый эффект, повешенный на страницу.
export function RefreshOnPing() {
  const { lastPingAt } = useNotifications();
  const router = useRouter();

  useEffect(() => {
    // Нулевое значение — пингов ещё не было, страница только что отрендерена
    // сервером и перезапрашивать её незачем.
    if (lastPingAt === 0) {
      return;
    }
    router.refresh();
  }, [lastPingAt, router]);

  return null;
}
