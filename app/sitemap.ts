import type { MetadataRoute } from "next";
import { getSitemapPosts, getSitemapUsers } from "@/lib/posts";
import { SITE_URL } from "@/lib/site";

/*
  Файловая конвенция Next: этот модуль отдаётся по адресу /sitemap.xml.

  Зачем он сайту, у которого и так всё связано ссылками: краулер обходит сайт,
  переходя по ссылкам, и до записи, уехавшей на двадцатый экран бесконечной
  ленты, он дойдёт не скоро — если дойдёт. Ленту он листать не будет, кнопку
  «Ещё» не нажмёт. Карта отдаёт ему все адреса разом и плоским списком.

  Её же читает и `lastModified`: краулер по нему решает, надо ли перечитывать
  страницу, которую он уже видел. Поэтому у записи стоит `updatedAt`, а не
  `createdAt` — отредактированная запись обязана выглядеть изменившейся.

  В карте только то, что открыто анониму: лента, дневники авторов и сами
  записи. Закрытые разделы и `/search` перечислены в app/robots.ts, и класть
  их сюда было бы прямым себе противоречием.

  Дневные страницы (`/day/[date]`) в карту не идут намеренно: они не новое
  содержимое, а тот же набор записей в другой нарезке. Краулеру это выглядит
  дублем, а нам не даёт ничего.

  `force-dynamic` здесь обязателен. Без него Next честно выполнит запрос
  ещё на сборке и вморозит результат в статический файл: карта застынет на
  момент деплоя и устареет с первой же новой записью — а деплоев тут меньше,
  чем записей. Заодно отвязывает сборку от доступности базы.
*/
export const dynamic = "force-dynamic";
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [posts, users] = await Promise.all([getSitemapPosts(), getSitemapUsers()]);

  return [
    {
      url: SITE_URL,
      lastModified: posts[0]?.updatedAt ?? new Date(),
      changeFrequency: "hourly",
      priority: 1,
    },
    ...users.map((user) => ({
      url: `${SITE_URL}/u/${user.username}`,
      changeFrequency: "daily" as const,
      priority: 0.6,
    })),
    ...posts.map((post) => ({
      url: `${SITE_URL}/u/${post.author.username}/${post.slug}`,
      lastModified: post.updatedAt,
      changeFrequency: "monthly" as const,
      // Записи — то, ради чего сайт существует, и им приоритет выше, чем
      // страницам-оглавлениям.
      priority: 0.8,
    })),
  ];
}
