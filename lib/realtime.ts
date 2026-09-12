import { supabase } from "@/lib/supabase";
import { PING_EVENT, userChannelTopic } from "@/lib/realtime-channel";

// "Звонок, а не транспорт": канал публичный и везёт ПУСТОЙ payload — ни текста,
// ни отправителя. Приватные каналы Realtime авторизуются RLS-политиками, которые
// читают Supabase-JWT, а сессия у нас в Better Auth — для Supabase наш юзер
// анонимус (auth.uid() = null). Получив пинг, браузер идёт за содержимым обычным
// Server Action'ом, который авторизуется сессионной кукой.
//
// Цена размена: знающий чужой userId увидит факт и время прихода сообщения.
// Ни текста, ни отправителя. Осознанно.
export async function notifyUser(userId: string): Promise<void> {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) return;

  const channel = supabase.channel(userChannelTopic(userId));
  try {
    // httpSend, а не send: у send() неявный HTTP-фолбэк объявлен устаревшим
    // (печатает warning), а httpSend — честный POST по REST и, в отличие от
    // подписки, не поднимает WebSocket ради одного пинга.
    await channel.httpSend(PING_EVENT, {});
  } finally {
    await supabase.removeChannel(channel);
  }
}
