import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Браузерный клиент — НИКОГДА не переиспользовать lib/supabase.ts: там
// service_role-ключ, и один импорт оттуда в клиентский компонент утащил бы
// админский ключ в бандл, который отдаётся каждому посетителю. Здесь только
// публичный anon-ключ, и нужен он ровно для одного — подписки на публичный
// канал с пингами.
//
// NEXT_PUBLIC_-префикс обязателен: без него Next не подставит значение в
// клиентский бандл, и переменная в браузере окажется undefined.
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

let client: SupabaseClient | null = null;

// Возвращает null, если переменные не настроены. Живая доставка —
// необязательное украшение: без неё сообщения всё равно приходят при первой
// навигации, поэтому отсутствие ключей это не ошибка, а выключенная фича.
export function getBrowserSupabase(): SupabaseClient | null {
  if (!url || !anonKey) {
    return null;
  }

  // Ленивый синглтон: один WebSocket на вкладку, а не по одному на каждый
  // ре-рендер провайдера.
  client ??= createClient(url, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  return client;
}
