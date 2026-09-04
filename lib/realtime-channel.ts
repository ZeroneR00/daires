// Общий словарь сервера и браузера: сервер шлёт сюда пинг, браузер на него
// подписывается. Файл намеренно БЕЗ ЕДИНОГО ИМПОРТА — его тянет клиентский
// код, и через любой импорт сюда могла бы приехать lib/supabase.ts со
// service_role-ключом, то есть админский ключ в браузерном бандле.
export function userChannelTopic(userId: string): string {
  return `user:${userId}`;
}

export const PING_EVENT = "ping";
