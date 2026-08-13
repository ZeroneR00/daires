
## music-diary
 
Платформа-блог для музыкальных дневников. Каждый зарегистрированный пользователь
ведёт свой блог: посты — это личный текст + прикреплённый трек, подтянутый через
внешний API. Вся творческая часть (текст, рефлексия) хранится в своей базе;
внешний API отвечает только за метаданные трека (название, артист, обложка,
превью).
 
## Стек
 
- Next.js 16+ (App Router), React 19, TypeScript
- Prisma + PostgreSQL (Supabase)
- Better Auth
- Tailwind CSS
- Supabase Storage — только для аватаров пользователей; обложки треков приходят по URL от внешнего API, свой storage для них не нужен
## Команды
 
```bash
npm run dev          # локальный дев-сервер
npm run build         # прод-сборка
npm run lint           # ESLint
npx prisma studio    # визуальный просмотр БД
npx prisma migrate dev --name <имя>   # новая миграция
```
 
## Структура маршрутов (App Router)
 
| Route | Назначение | Доступ |
|---|---|---|
| `/` | Лента публичных постов | публично |
| `/u/[username]` | Страница-дневник пользователя | публично |
| `/u/[username]/[slug]` | Отдельный пост | публично |
| `/new` | Создание поста (поиск трека + текст) | только автор, залогинен |
| `/post/[id]/edit` | Редактирование своего поста | только автор поста |
| `/settings` | Профиль, аватар, bio | залогинен |
| `/following` | Персональная лента (посты тех, на кого подписан) | залогинен |
| `/search` | Сквозной поиск (посты + треки + пользователи) | публично |
| `/login`, `/signup` | Авторизация | публично |
 
## Карта файлов

Ниже — где что лежит, чтобы не приходилось грепать/сканировать весь проект
ради ориентировки (актуально на 2026-08-10; если структура успела уйти
вперёд — доверять коду, не этой таблице).

**Auth**
| Файл | Что там |
|---|---|
| `lib/auth.ts` | конфиг Better Auth (сервер): `prismaAdapter`, zod-валидация `username` |
| `lib/auth-client.ts` | `authClient` для клиентских компонентов |
| `app/api/auth/[...all]/route.ts` | catch-all route handler Better Auth |
| `app/login/page.tsx`, `app/signup/page.tsx` | формы, зовут `authClient` напрямую (сознательное исключение из "мутации только через Server Actions" — это плюмбинг Better Auth, не бизнес-мутация) |

**Layout / навигация**
| Файл | Что там |
|---|---|
| `app/layout.tsx` | корневой layout, монтирует `<Header />` |
| `components/Header.tsx` | шапка сайта |
| `components/SessionStatus.tsx` | реактивная часть шапки (client component, `authClient.useSession()`) — не читать сессию через `auth.api.getSession()` здесь, layout не перечитывается при клиентской навигации |
| `components/SignOutButton.tsx` | кнопка выхода |

**Создание и редактирование поста (`/new`, `/post/[id]/edit`)**
| Файл | Что там |
|---|---|
| `app/new/page.tsx` + `actions.ts` | страница создания поста; `createPost` Server Action + `searchTracksAction` |
| `app/post/[id]/edit/page.tsx` + `actions.ts` | страница редактирования; `updatePost` Server Action. Guard на владение постом — на обоих уровнях (page → `notFound()`, action → ранний `return {error}`), не полагаться только на UI |
| `components/PostForm.tsx` | общая форма (текст + треки), используется и на `/new`, и на `/post/[id]/edit`: пропы `initialText?`, `initialTracks?`, `action`, `submitLabel`, `pendingLabel` |
| `components/TrackPickerDialog.tsx` | модалка поиска трека (`<dialog>`, дебаунс) |
| `lib/post-schema.ts` | общая zod-схема `postInputSchema`/`PostInput`, используется и `createPost`, и `updatePost` — правило "текст ИЛИ трек, что-то одно обязательно" |
| `lib/post-mutations.ts` | `attachTracksToPost` — общий upsert-Track-по-`externalId` + create-`PostTrack`, вызывается внутри транзакции из обоих экшенов |
| `lib/track-api.ts` | обёртка над iTunes/MusicBrainz, тип `NormalizedTrack` |
| `lib/slug.ts` | генерация уникального slug поста (не меняется при редактировании) |

**Настройки профиля (`/settings`)**
| Файл | Что там |
|---|---|
| `app/settings/page.tsx` | `auth.api.getSession()` → `redirect("/login")` если нет сессии; префилл через `getUserByUsername` (`lib/posts.ts`), рендерит `AvatarUploadForm` и `SettingsForm` |
| `app/settings/actions.ts` | `updateProfile` Server Action — session check, zod-парсинг, `prisma.user.update({ name, bio })` напрямую (не через `authClient.updateUser()` — `bio` не зарегистрирован как Better Auth `additionalField`), без redirect, `revalidatePath` для `/` и `/u/[username]`. Плюс `uploadAvatar`/`removeAvatar` — тот же session-check, файл валидируется `avatarFileSchema`, путь в bucket фиксированный `avatars/<userId>` с `{ upsert: true }` (перезаписывает старый файл, без явного удаления), публичный URL кэш-бастится `?v=<timestamp>` при каждой загрузке |
| `lib/profile-schema.ts` | `profileInputSchema`/`ProfileInput` — `name` обязателен (`max(100)`), `bio` опционален (`max(280)`, пустая строка → `null`). Плюс `avatarFileSchema`/`MAX_AVATAR_SIZE`/`ALLOWED_AVATAR_TYPES` — ≤3 МБ, только `image/jpeg`\|`image/png`\|`image/webp` (SVG сознательно исключён — может содержать `<script>`) |
| `components/SettingsForm.tsx` | форма по образу `PostForm`: поля `name`/`bio`, клиентская проверка непустого имени, инлайн "Сохранено" вместо редиректа |
| `components/AvatarUploadForm.tsx` | client-компонент, нативный `<form action={fn}>` + `FormData` + `useActionState` (не `useTransition`, как в `SettingsForm` — `File` нельзя передать JS-объектом) для `uploadAvatar`/`removeAvatar`; локальный `avatarUrl`/`message` state обновляется внутри самих action-обёрток. `<input type="file">` спрятан (`hidden`) и триггерится стилизованным `<label htmlFor>` — нативный вид инпута не стилизуется CSS; выбор файла сам вызывает `form.requestSubmit()` в `onChange`, отдельной кнопки "Загрузить" нет (раньше была — путала: клик мимо крошечного нативного поля сразу давал "Файл не выбран") |
| `components/Avatar.tsx` | общий презентационный компонент (`url`, `size?`) — фото или кружок-плейсхолдер; переиспользуется на `/settings`, `/u/[username]`, `PostCard`, странице поста |

**Чтение данных (лента / дневник / пост)**
| Файл | Что там |
|---|---|
| `lib/posts.ts` | единый query-слой: `getFeedPosts`, `getPostsByUsername`, `getPostBySlug`, `getPostById`, `getUserByUsername`, `getCommentsForPost` |
| `app/page.tsx` | лента (`/`) |
| `app/u/[username]/page.tsx` + `not-found.tsx` | дневник пользователя |
| `app/u/[username]/[slug]/page.tsx` + `not-found.tsx` | отдельный пост |
| `components/PostCard.tsx` | карточка поста (лента + дневник); принимает `currentUserId?` — ссылка "Редактировать" видна только автору |
| `components/TrackRow.tsx` | строка трека (пикер, карточка, страница поста) |

**Комментарии (только на странице поста, `/u/[username]/[slug]`)**
| Файл | Что там |
|---|---|
| `lib/comment-schema.ts` | `commentInputSchema`/`CommentInput` — текст 1–1000 символов |
| `app/u/[username]/[slug]/actions.ts` | `createComment(postId, text)` и `deleteComment(formData)` Server Actions; владение проверяется по автору *комментария*, не поста — модерация чужих комментариев автором поста не реализована (сознательно вне скоупа) |
| `components/CommentForm.tsx` | контролируемая textarea + `useTransition` (не `<form action>`, чтобы после успешной отправки можно было программно очистить поле) |
| `components/CommentList.tsx` | серверный компонент, кнопка "Удалить" рендерится только когда `comment.authorId === currentUserId`; сам delete — zero-JS `<form action={deleteComment}>` на каждый комментарий |

**Лайки (видны и кликабельны в трёх местах: лента, дневник, страница поста)**
| Файл | Что там |
|---|---|
| `lib/like-actions.ts` | `toggleLike(postId, authorUsername, slug)` Server Action — не в `app/.../actions.ts` одного роута, т.к. вызывается из трёх разных страниц; `findUnique` по составному `postId_userId` → `create`/`delete`; `revalidatePath` для `/`, `/u/[username]` и `/u/[username]/[slug]` разом |
| `components/LikeButton.tsx` | client component, импортирует `toggleLike` напрямую (без прокидывания action-пропом — нет единого роута-владельца); React 19 `useOptimistic` + `useTransition` для мгновенного отклика без ручного отката при ошибке |
| `lib/posts.ts` | `_count: { select: { likes: true } }` в общем `postWithDetails` include — счётчик долетает сразу до всех read-функций; отдельный `getLikedPostIds(userId, postIds)` — batch-проверка "лайкнул ли лично я", не кешируется вместе с постом (зависит от зрителя, как и `isOwner`) |

**Подписки (кнопка только на `/u/[username]`, лента на `/following`)**
| Файл | Что там |
|---|---|
| `app/u/[username]/actions.ts` | `toggleFollow(targetUsername)` Server Action — в отличие от `toggleLike`, живёт в `actions.ts` конкретного роута, а не в общем `lib/`, т.к. кнопка подписки есть только на одной странице (дневник автора), не в трёх местах, как у лайка. Гард на self-follow — на уровне экшена (`targetId === session.user.id`), не только скрытием кнопки в UI; `revalidatePath` для `/u/[username]` и `/following` |
| `components/FollowButton.tsx` | client component, `useOptimistic` + `useTransition` — та же формула дельты счётчика, что и в `LikeButton` (баг с двойным счётом, пойманный на лайках, здесь сразу учтён) |
| `app/following/page.tsx` | персональная лента: `redirect("/login")` для анонимусов (по образцу `/new`), `getFollowingFeedPosts` + `getLikedPostIds`, отдельный текст пустого состояния (не путать с пустой глобальной лентой) |
| `lib/posts.ts` | `_count: { select: { followers: true, following: true } }` в `getUserByUsername`; `isFollowing(followerId, followingId)` — по образцу `getLikedPostIds`, но для одной пары; `getFollowingFeedPosts(userId)` — `postWithDetails` с `where: author.followers.some.followerId = userId` |
| `components/SessionStatus.tsx` | ссылка "Моя лента" на `/following` в залогиненном блоке |

**Сквозной поиск (строка в шапке на всех страницах, результаты на `/search`)** — про сам движок и грабли см. раздел "Поиск по сайту"
| Файл | Что там |
|---|---|
| `prisma/migrations/20260811160308_add_fulltext_search_indexes/migration.sql` | первая написанная руками (не сгенерированная) миграция в проекте — три GIN expression-индекса. Без `CONCURRENTLY`: Prisma гоняет миграции в транзакции, а `CREATE INDEX CONCURRENTLY` вне транзакции работать не может |
| `lib/search.ts` | `searchPosts`/`searchTracks`/`searchUsers`, лимит `SEARCH_RESULT_LIMIT = 10` на категорию. Единственное место в проекте с raw SQL, и намеренно двухфазное: `$queryRaw` достаёт **только `id`** в порядке `ts_rank`, дальше обычная гидратация через Prisma (нужны `include` с автором/треками/`_count`, плоские строки из raw SQL не годятся) + ручная ресортировка `reorderByIds` — `where: { id: { in: ids } }` порядок не гарантирует. Только тегированный темплейт `$queryRaw`, **никогда `$queryRawUnsafe`** с конкатенацией: параметры уходят отдельно от текста запроса. Тип `$queryRaw<T>` компилятор проверить не может — это обещание, а не проверка, поэтому raw SQL держим минимальным и в одном файле |
| `lib/posts.ts` | `getPostsByIds(ids)` — та же `postWithDetails`-подгрузка, но `findMany({ where: { id: { in: ids } } })` и **без `orderBy`**: порядок задаёт ранжирование в `lib/search.ts` |
| `app/search/page.tsx` | публичный роут (сессия читается только ради `getLikedPostIds`, редиректа нет). `searchParams` — промис. Гард `< 2` символов → подсказка без запроса к БД. Три поиска через `Promise.all` (независимы). Пустая секция не рендерится; пусто везде → "Ничего не найдено". `PageShell`/`Section`/`EmptyState` — локальные неэкспортируемые компоненты этого файла (нужны в обеих ветках вывода, но никому снаружи) |
| `components/SearchBar.tsx` | `<Form action="/search">` из `next/form`, не обычный `<form>` — client-side навигация + prefetch, без JS деградирует до обычного сабмита. Серверный компонент: интерактивности нет. Кнопки нет намеренно — форма с единственным полем сабмитится по Enter сама (implicit submission); `aria-label` вместо `<label>`, т.к. плейсхолдер именем поля не считается |
| `components/UserResultRow.tsx` | строка результата-пользователя по образцу `TrackRow`: свой минимальный интерфейс пропов вместо импорта модели Prisma. Для постов и треков переиспользуются `PostCard`/`TrackRow` как есть |
| `components/Header.tsx` | `<SearchBar />` между логотипом и `<SessionStatus />`; логотипу добавлен `shrink-0`, контейнеру `gap-4` — иначе флекс сжимает логотип |

**Инфраструктура**
| Файл | Что там |
|---|---|
| `lib/prisma.ts` | синглтон `PrismaClient` с `PrismaPg`-адаптером |
| `lib/supabase.ts` | синглтон `service_role`-клиента Supabase Storage (`@supabase/supabase-js`), по образу `lib/prisma.ts`; импортируется только из Server Actions (`app/settings/actions.ts`), никогда с клиента. `SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY` в `.env.local`, отдельно от `DATABASE_URL`/`DIRECT_URL` — тот же Supabase-проект, но Storage API, не Postgres |
| `lib/format-date.ts` | `formatPostDate` (`Intl.DateTimeFormat("ru")`) |
| `prisma/schema.prisma` | схема БД |
| `prisma.config.ts` | конфиг CLI (`DIRECT_URL`, не `DATABASE_URL` — см. ниже) |

## Data model (Prisma)
 
Ключевые модели: `User`, `Track`, `Post`, `PostTrack`, `Comment`, `Like`, `Follow`.
`Post` привязан к одному `User` (автор) и может содержать несколько `Track`
через join-таблицу `PostTrack` (many-to-many, с полем `position` для порядка
треков в посте). `Track` кешируется по `externalId`, чтобы не дублировать
записи и не дёргать внешний API повторно для уже залогированных треков.
Полная схема — в `prisma/schema.prisma`.

## Технические детали версий (сверено вручную с доками, не полагаться на training data)

**У Prisma есть собственные официальные Claude Code skills** — `npx prisma init` сам ставит их в `.claude/skills/prisma-*` (источник — репозиторий `prisma/skills` на GitHub, см. `skills-lock.json`). Там же лежит `prisma-upgrade-v7` — актуальный гайд по breaking changes от самой Prisma. **Перед тем как гуглить/WebFetch доки Prisma — сначала проверить `.claude/skills/prisma-*/SKILL.md` и `references/*.md` внутри, они уже могут быть локально.**

**Prisma 7** сломал привычный способ работы с клиентом по сравнению с версиями ≤6:
- В `generator client` теперь обязателен явный `output` (например `output = "../generated/prisma"`), провайдер — `"prisma-client"` (не `"prisma-client-js"`)
- Клиент импортируется из сгенерированной папки в проекте (`@/generated/prisma/client` — в `generated/prisma/` нет `index.ts`, только `client.ts`/`browser.ts`), а **не** из `@prisma/client`
- Обязателен driver adapter поверх обычного JS-драйвера (нет больше встроенного Rust-бинарника-движка). Для Postgres — `@prisma/adapter-pg` + `pg`:
  ```ts
  import { PrismaPg } from "@prisma/adapter-pg";
  import { PrismaClient } from "@/generated/prisma/client";

  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter });
  ```
- **`url`/`directUrl`/`shadowDatabaseUrl` больше не живут в `schema.prisma`!** Блок `datasource` там теперь содержит только `provider = "postgresql"`. Реальные connection-строки переехали в `prisma.config.ts` → `defineConfig({ datasource: { url } })`. **Важно:** `directUrl` в реальном типе `Datasource` не существует (только `url`/`shadowDatabaseUrl`) — подробности и правильная схема ниже.
- `prisma.config.ts` выполняется Prisma CLI как отдельный Node-скрипт, **вне** Next.js — поэтому `.env.local` он не подхватывает автоматически (Next.js грузит `.env.local` только для своего рантайма). Нужен явный `dotenv`: `import { config } from "dotenv"; config({ path: ".env.local" });` в начале `prisma.config.ts`, и сам пакет `dotenv` должен быть явной зависимостью в `package.json` (а не транзитивной).

**Better Auth** (v1.6.x) — пакет называется просто `better-auth` (не `@better-auth/*`). Prisma-адаптер — `prismaAdapter` из `better-auth/adapters/prisma`. CLI для генерации схемы — `npx auth@latest generate` (пакет CLI называется `auth`), дописывает модели `User`/`Session`/`Account`/`Verification` в `schema.prisma`, читая конфиг из `lib/auth.ts` — то есть `lib/auth.ts` должен существовать и импортироваться без ошибок **до** запуска этой команды.

**Supabase + Prisma подключение** — нужны два разных URL на одну и ту же БД:
- `DATABASE_URL` — transaction pooler, порт 6543, `?pgbouncer=true` — для рантайма приложения
- `DIRECT_URL` — session pooler, порт 5432, без `pgbouncer` — для `prisma migrate` (настоящий direct-connect у Supabase только по IPv6; session pooler — IPv4-совместимая замена, которая в отличие от transaction pooler поддерживает миграции)

**`P1001: Can't reach database server` от Prisma не всегда значит проблему с сетью** — через pgbouncer (transaction pooler, порт 6543) эта ошибка может маскировать обычный `28P01: password authentication failed`. Если TCP-соединение до хоста при этом раскрывается нормально (проверить `Test-NetConnection`/аналог) — не тратить время на сетевую диагностику, а сразу проверить сам пароль прямым тестовым подключением через `pg` (`new pg.Client({connectionString}).connect()`), это даёт настоящую причину.

**`directUrl` в `prisma.config.ts` не существует — реальная причина плавающих зависаний/ошибок `migrate`/`db push` (найдено 2026-08-06 через `npx tsc --noEmit`).** Тип `Datasource` в `@prisma/config` (`node_modules/@prisma/config/dist/index.d.ts`) содержит только `url` и `shadowDatabaseUrl` — поля `directUrl` там нет и не было, несмотря на то что так же писал даже один из референсов официального skill `prisma-upgrade-v7` (`references/prisma-config.md` — расхождение с реальным типом, не доверять слепо и этим референсам, перепроверять tsc'ом). Поле тихо игнорировалось (конфиг грузится без тайпчека), из-за чего CLI-команды всё это время ходили через `DATABASE_URL` (transaction pooler, порт 6543) вместо `DIRECT_URL` — а pgbouncer в transaction-режиме не гарантирует операции уровня сессии, нужные миграциям (advisory locks, `CREATE DATABASE` для shadow-базы). Отсюда нестабильность: то зависание, то `P1001`, то `P1000` — в отличие от простых запросов через голый `pg`, которые транзакционный pooler спокойно тянет.

**Правило:** в `prisma.config.ts` → `datasource` класть **только** `url`, и туда должен идти `DIRECT_URL` (session pooler), а не пулированный `DATABASE_URL`. `DATABASE_URL` нужен исключительно рантайму приложения (driver adapter в коде, `lib/auth.ts` и т.п.) — `prisma.config.ts` он не касается вообще, это конфиг только для CLI-тулинга (migrate/db push/studio).

**Если Prisma CLI видит, что её вызывает AI-агент** (Claude Code и подобные) — она блокирует опасные команды типа `migrate reset` без явного согласия человека и просит перезапустить с `PRISMA_USER_CONSENT_FOR_DANGEROUS_AI_ACTION=<точный текст согласия пользователя>`. Это встроенная защита самой Prisma, не баг — всегда спрашивать пользователя перед таким перезапуском, не обходить.

## Внешние API
 
**Основной — iTunes Search API** (`https://itunes.apple.com/search`)
- без ключа, ~20 запросов/минуту на IP (неофициальный лимит) — обязателен дебаунс на поиске
- отдаёт title, artist, album, artworkUrl, 30-сек previewUrl
**Резервный — MusicBrainz API** (`https://musicbrainz.org/ws/2/`)
- без ключа, но обязателен свой `User-Agent` заголовок
- лимит 1 запрос/секунду на IP — превышение временно блокирует IP
- используется, если iTunes не нашёл трек
Оба запроса — **только на сервере** (server actions / route handlers), никогда
с клиента: у MusicBrainz нужен кастомный заголовок, а лимиты обоих API считаются
по IP, так что их надо контролировать централизованно и кешировать.
 
## Поиск по сайту (реализовано 2026-08-13)

Важно не путать с поиском трека на `/new` (это поиск во внешнем iTunes/MusicBrainz
API при создании поста, уже описан выше в "Внешние API"). Здесь речь о другом —
о сквозном поиске по уже своим данным: посты, треки, пользователи. Движок —
встроенный полнотекстовый поиск Postgres, без сторонних сервисов
(Meilisearch/Algolia) — не тащим новую инфраструктуру, пока нет реальной нагрузки.

Что неочевидно и стоит помнить:

- **Индексы живут только в миграции, не в `schema.prisma`.** Prisma не умеет
  объявлять `tsvector`/GIN — три expression-индекса написаны руками
  (`prisma/migrations/*_add_fulltext_search_indexes/`). Выбраны expression-индексы
  (`USING GIN (to_tsvector(...))`), а не хранимая generated-колонка: индекс сам
  всегда синхронен с данными, ни новой колонки, ни триггера. **Проверено:
  дрейфом Prisma это не считает** (`migrate diff` → пусто, `migrate dev` →
  "Already in sync"), удалить не предложит. Обратная сторона: `schema.prisma`
  больше не полное описание БД — про эти индексы знает только папка миграций.
- **Выражение в `WHERE` должно буквально совпадать с выражением в индексе**,
  иначе Postgres индекс не подхватит. Отсюда дублирование `to_tsvector(...)`
  в `WHERE` и в `ORDER BY ts_rank(...)` в `lib/search.ts` — это не копипаста
  по недосмотру.
- **Колонки в склейке обязаны быть NOT NULL.** В SQL `'текст' || NULL` = `NULL`,
  так что одно nullable-поле в `title || ' ' || artist` тихо выкинуло бы строку
  из индекса. Сейчас все четыре склеиваемых поля NOT NULL — при изменении схемы
  перепроверить.
- **`websearch_to_tsquery`, а не `to_tsquery`** — не падает на произвольном
  пользовательском вводе (одиночные `!`, `&`, кавычки), плюс даёт Google-подобный
  синтаксис (`"фраза"`, `or`, `-исключение`). `to_tsquery` на мусоре кидает
  исключение → 500 на публичной странице.
- **`'russian'` для постов, `'simple'` для треков/юзеров.** Постам нужен
  стемминг («замечательные» находит «замечательный»), именам и названиям он бы
  только мешал, и они не обязательно на русском.
- **Префиксного поиска нет** — FTS матчит слова/основы целиком, `zer` не найдёт
  `ZeroneR`. Это ограничение движка, не баг. Если понадобится тайпахед —
  отдельным шагом через `pg_trgm` или `to_tsquery` с `:*`.
- **Отлаживать поиск с кириллицей из Git Bash нельзя** — шелл на Windows отдаёт
  аргументы в cp1251, `curl --data-urlencode` честно закодирует битые байты, и
  получится ложный вывод "кириллица не ищется" при исправном коде. Проверять
  Node-скриптом (файл в UTF-8) или из браузера.

## Конвенции
 
- Мутации — через Server Actions, не через отдельные API routes
- Названия компонентов — PascalCase
- Все внешние запросы к трек-API оборачивать в общий нормализованный тип (единый формат независимо от источника — iTunes или MusicBrainz)
- Перед созданием `Track` — всегда `upsert` по `externalId`, не `create`
- Секреты только в `.env`, никогда не коммитить
## Приоритет фич
 
**Must have:** регистрация/логин, создание поста с поиском трека, публичная лента + страница юзера + страница поста, владение постом (редактирует только автор)
 
**Should have:** комментарии, лайки, подписки + персональная лента
 
**Nice to have:** сквозной поиск (посты + треки + пользователи, см. "Поиск по сайту"), статистика профиля, RSS-лента
 
## Про разработчика
 
Solo-разработчик уровня junior-to-middle, возвращается к активной разработке
после ~7 лет перерыва в React-экосистеме. Стек в целом знаком, но многое нужно
вспоминать заново — не считать полным новичком, но и не считать, что все
детали текущих версий инструментов держатся в голове. Работает через агента
(Claude Code) — пишет код агент, разработчик разбирается в результате и
принимает архитектурные решения. Общение — на русском, английские технические
термины сохранять как есть, не переводить.

У разработчика может быть нестабильный интернет (специфика места работы) — это
норма, а не признак проблемы в проекте/коде. Обрывы вида `ECONNRESET` на
`npm install` или `P1001: Can't reach database server` на `prisma migrate`
чаще всего чинятся простым повтором команды. Не нужно тратить время на
глубокую диагностику сети при первом же сбое — сначала просто retry.
 
## Роль агента
 
Функционируй как senior-ментор, а не просто "исполнитель тикетов":
 
- Перед не тривиальными изменениями — объясняй рассуждение (почему именно так, а не только что делаешь)
- После изменений — коротко резюмируй, что сделано и почему именно таким способом
- Во время работы (не только до/после) — периодически поясняй, что именно сейчас делаешь, особенно на длинных многошаговых задачах, а не молчи до самого результата
- Не вываливай код без объяснения, если разработчик не попросил явно "просто сделай"
- Для сложных/многофайловых задач — сначала предлагай план (Plan Mode), не бросайся сразу в правки
- Мелкие, проверяемые шаги вместо одного большого изменения на всю фичу
- Предпочтительный формат ответов — структурированные таблицы и короткие абзацы, не длинная проза
- Если задача расплывчата — уточни, не додумывай архитектурные решения молча
- Обращение — на "ты", без официоза
- Уместны шутки, когда ситуация располагает (не в каждом ответе через силу)
- Смайлики приветствуются 🙂
- Разрешаю иногда (когда это уместно) спорить со мной (когда ты уверен в том что ты прав) и даже на повышенных тонах. Ведь в спорах рождается истина.

## Обучение

Для разработчика важен не только рабочий результат, но и понимание —
это осознанное совмещение разработки с изучением/освежением стека. Поэтому:

- Объясняй не только "почему выбрано такое решение", но и "как это устроено
  и работает" — на уровне, достаточном чтобы дальше действовать самостоятельно
- Если есть несколько способов сделать одно и то же — кратко называй
  альтернативы и почему выбран именно этот
- Не бойся давать чуть больше контекста, чем нужно для конкретной задачи,
  если это помогает понять механизм, а не просто скопировать код
- Если нужно представить план (например, из Plan Mode) — сначала простыми
  словами, через аналогию с уже сделанным в проекте (пример: аватарка —
  такая же ссылка, как обложка трека, ничего нового изобретать не надо).
  Технические детали (имена файлов, конкретные API) — только по запросу.
  Файл плана — это шпаргалка для самого агента на следующую сессию, не текст
  для разработчика; не пересказывать его как есть.
- Объяснять код лучше по шагам прямо во время реализации, а не одной стеной
  текста заранее — так усваивается лучше (сработало 2026-08-08 на примере
  сессии про аватар: стена терминов про Server Actions/RLS/service_role не
  зашла, а аналогия с обложкой трека и обещание объяснять по ходу — зашли)

## Чего избегать
 
- Не дублировать логику запроса к трек-API в разных местах — один общий модуль-обёртка
- Не хранить обложки/превью треков в своём storage — только ссылки от API
- Не давать доступ на редактирование/удаление чужих постов ни при каких условиях

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
