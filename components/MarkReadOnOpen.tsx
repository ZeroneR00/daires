"use client";

import { useEffect, useTransition } from "react";
import { markConversationRead } from "@/lib/message-actions";
import { useNotifications } from "@/components/NotificationsProvider";

// Отметка "прочитано" ставится с клиента, а не при рендере страницы диалога:
// серверный компонент во время рендера мутировать данные не может (и не должен
// — revalidatePath посреди рендера Next запрещает). Поэтому открытие чата это
// эффект: смонтировались — отметили.
//
// Повторяется на каждом пинге: пришло новое сообщение в открытый диалог — оно
// прочитано сразу, счётчик в шапке не должен мигать единицей.
export function MarkReadOnOpen({ otherUsername }: { otherUsername: string }) {
  const { lastPingAt, refresh } = useNotifications();
  const [, startTransition] = useTransition();

  useEffect(() => {
    startTransition(async () => {
      await markConversationRead(otherUsername);
      // Экшен ревалидирует серверные страницы, но не клиентскую шапку —
      // цифру непрочитанных двигаем явно, как это делает FriendButton.
      refresh();
    });
  }, [otherUsername, lastPingAt, refresh]);

  return null;
}
